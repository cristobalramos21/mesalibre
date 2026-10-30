import { getSupabase, SupabaseConfigError } from "./supabase";
import type { EstadoActual, Lugar } from "./tipos";

export type LugarConEstado = Pick<Lugar, "id" | "slug" | "nombre" | "zona"> & {
  estado: EstadoActual | undefined;
};

export type ResultadoLugares =
  | { ok: true; lugares: LugarConEstado[]; leidoEnMs: number } // leidoEnMs: base para "hace X min"
  | { ok: false; mensaje: string; detalle?: string };

export async function cargarLugaresConEstado(): Promise<ResultadoLugares> {
  try {
    const supabase = getSupabase();
    const [lugares, estados] = await Promise.all([
      supabase
        .from("lugares")
        .select("id, slug, nombre, zona")
        .eq("activo", true)
        .order("nombre"),
      supabase.from("estado_actual").select("*"),
    ]);

    const error = lugares.error ?? estados.error;
    if (error) {
      console.error("Supabase:", error);
      return {
        ok: false,
        mensaje: "No pudimos cargar los lugares. Intenta de nuevo en un momento.",
        detalle: `${error.code ?? ""} ${error.message}`.trim(),
      };
    }

    const porLugar = new Map(
      ((estados.data ?? []) as EstadoActual[]).map((e) => [e.lugar_id, e]),
    );
    return {
      ok: true,
      lugares: (lugares.data ?? []).map((l) => ({ ...l, estado: porLugar.get(l.id) })),
      leidoEnMs: Date.now(),
    };
  } catch (e) {
    if (e instanceof SupabaseConfigError) {
      return { ok: false, mensaje: "La app no está configurada.", detalle: e.message };
    }
    console.error("Error cargando lugares:", e);
    return {
      ok: false,
      mensaje: "No pudimos conectarnos. Revisa tu conexión e intenta de nuevo.",
      detalle: e instanceof Error ? e.message : undefined,
    };
  }
}
