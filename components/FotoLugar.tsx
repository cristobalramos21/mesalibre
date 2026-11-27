"use client";

import { useEffect, useState } from "react";
import { Camera, EyeOff } from "lucide-react";
import { FOTO_VIGENCIA_MIN } from "@/lib/config";
import { TEXTO_NIVEL, textoAntiguedad } from "@/lib/estado";
import { cargarFotoReciente, ocultarFoto, urlFoto, type FotoReciente } from "@/lib/fotos";
import type { EstadoActual, Lugar } from "@/lib/tipos";

// Rec. 3 · Última foto reportada del lugar (≤ FOTO_VIGENCIA_MIN), con su antigüedad y el nivel
// que reportó quien la tomó. Se vuelve a pedir cada vez que cambian los estados (Realtime/polling).
export function FotoLugar({ lugar, estados, ahora }: { lugar: Lugar; estados: EstadoActual[]; ahora: number }) {
  const [foto, setFoto] = useState<FotoReciente | null>(null);
  const [confirmar, setConfirmar] = useState(false);

  useEffect(() => {
    let vigente = true;
    cargarFotoReciente(lugar.id).then((f) => {
      if (vigente) setFoto(f);
    });
    return () => {
      vigente = false;
    };
  }, [lugar.id, estados]);

  if (!foto) return null;
  const tomadaMs = new Date(foto.creado_en).getTime();
  if (ahora - tomadaMs > FOTO_VIGENCIA_MIN * 60_000) return null;

  const ocultar = async () => {
    if (await ocultarFoto(foto.foto_path)) setFoto(null);
    setConfirmar(false);
  };

  return (
    <figure className="mt-4">
      {/* eslint-disable-next-line @next/next/no-img-element -- imagen de Supabase Storage, sin optimizar */}
      <img
        src={urlFoto(foto.foto_path)}
        alt={`Foto de ${lugar.nombre} enviada por un estudiante`}
        loading="lazy"
        className="max-h-64 w-full rounded-xl bg-border/60 object-cover"
      />
      <figcaption className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 text-sm text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Camera aria-hidden size={16} className="shrink-0" />
          Foto {textoAntiguedad(tomadaMs, ahora)} · reportó «{TEXTO_NIVEL[foto.nivel]}»
        </span>
        {confirmar ? (
          <span className="inline-flex items-center gap-1">
            ¿Ocultarla para todos?
            <button type="button" onClick={ocultar} className="min-h-11 px-2 font-semibold text-lleno underline">
              Sí
            </button>
            <button type="button" onClick={() => setConfirmar(false)} className="min-h-11 px-2 font-semibold underline">
              No
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmar(true)}
            className="inline-flex min-h-11 items-center gap-1 underline underline-offset-2"
          >
            <EyeOff aria-hidden size={15} /> Ocultar foto
          </button>
        )}
      </figcaption>
    </figure>
  );
}
