import { FOTO_BUCKET, FOTO_BYTES_MAX, FOTO_LADO_MAX, FOTO_TIMEOUT_MS } from "./config";
import { nuevoUuid } from "./device";
import { getSupabase } from "./supabase";
import type { NivelOcupacion } from "./tipos";

export type FotoReciente = { foto_path: string; nivel: NivelOcupacion; creado_en: string };

// Achica la foto y la vuelve a codificar como JPEG en un canvas. Así pesa poco y se pierden
// los metadatos EXIF (incluida la ubicación GPS). Los navegadores actuales ya aplican la
// orientación EXIF al dibujar la imagen.
export async function comprimirFoto(archivo: File): Promise<Blob> {
  const url = URL.createObjectURL(archivo);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("No se pudo leer la imagen"));
      i.src = url;
    });
    const escala = Math.min(1, FOTO_LADO_MAX / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * escala);
    canvas.height = Math.round(img.naturalHeight * escala);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const calidad of [0.72, 0.55, 0.4]) {
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", calidad));
      if (blob && blob.size <= FOTO_BYTES_MAX) return blob;
    }
    throw new Error("La foto pesa demasiado");
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Sube la foto con nombre aleatorio (<uuid>.jpg, lo exige la política del bucket) y devuelve la ruta.
export async function subirFoto(blob: Blob): Promise<string> {
  const ruta = `${nuevoUuid()}.jpg`;
  let espera: ReturnType<typeof setTimeout> | undefined;
  const tiempo = new Promise<never>((_, reject) => {
    espera = setTimeout(() => reject(new Error("La subida de la foto tardó demasiado")), FOTO_TIMEOUT_MS);
  });
  try {
    const { error } = await Promise.race([
      getSupabase().storage.from(FOTO_BUCKET).upload(ruta, blob, { contentType: "image/jpeg", upsert: false }),
      tiempo,
    ]);
    if (error) throw error;
    return ruta;
  } finally {
    clearTimeout(espera);
  }
}

export function urlFoto(ruta: string): string {
  return getSupabase().storage.from(FOTO_BUCKET).getPublicUrl(ruta).data.publicUrl;
}

// Última foto del lugar con menos de FOTO_VIGENCIA_MIN y que nadie ocultó (null si no hay
// o si la BD todavía no tiene la migración 007).
export async function cargarFotoReciente(lugarId: string): Promise<FotoReciente | null> {
  const { data, error } = await getSupabase().rpc("foto_reciente", { p_lugar_id: lugarId });
  if (error) {
    console.error("foto_reciente:", error);
    return null;
  }
  return ((data ?? []) as FotoReciente[])[0] ?? null;
}

export async function ocultarFoto(ruta: string): Promise<boolean> {
  const { error } = await getSupabase().rpc("ocultar_foto", { p_foto_path: ruta });
  if (error) console.error("ocultar_foto:", error);
  return !error;
}
