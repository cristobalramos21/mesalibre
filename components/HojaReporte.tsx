"use client";

import { useRef, useState } from "react";
import { Megaphone, X } from "lucide-react";
import { ESTILOS_ESTADO, ICONOS_ESTADO } from "@/components/EstadoBadge";
import { obtenerDeviceId } from "@/lib/device";
import { getSupabase } from "@/lib/supabase";
import type { Lugar, NivelOcupacion } from "@/lib/tipos";

const OPCIONES: { nivel: NivelOcupacion; texto: string; detalle: string }[] = [
  { nivel: "libre", texto: "Libre", detalle: "Hay mesas para grupos" },
  { nivel: "pocas", texto: "Pocas mesas", detalle: "1 o 2 mesas, o compartir" },
  { nivel: "lleno", texto: "Lleno", detalle: "No hay dónde sentarse" },
];

type Envio = "elegir" | "enviando" | "ok" | "cooldown" | "error";

// F10 · Botón "¿Cómo está ahora?" + hoja inferior para reportar (<dialog> nativo).
export function HojaReporte({ lugar, onReportado }: { lugar: Lugar; onReportado: () => void }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [envio, setEnvio] = useState<Envio>("elegir");

  const abrir = () => {
    setEnvio("elegir");
    dialogo.current?.showModal();
  };
  const cerrar = () => dialogo.current?.close();

  const reportar = async (nivel: NivelOcupacion) => {
    setEnvio("enviando");
    const { data, error } = await getSupabase().rpc("insert_reporte", {
      p_lugar_id: lugar.id,
      p_nivel: nivel,
      p_device_id: obtenerDeviceId(),
    });
    if (error) {
      console.error("insert_reporte:", error);
      setEnvio("error");
      return;
    }
    if (data === "cooldown") {
      setEnvio("cooldown");
      return;
    }
    setEnvio("ok");
    onReportado();
    setTimeout(cerrar, 1500);
  };

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-foreground bg-card px-3 font-semibold"
      >
        <Megaphone aria-hidden size={18} />
        ¿Cómo está ahora?
      </button>

      <dialog
        ref={dialogo}
        aria-labelledby="titulo-reporte"
        onClick={(e) => e.target === dialogo.current && cerrar()}
        className="fixed inset-x-0 top-auto bottom-0 m-0 mx-auto w-full max-w-[480px] rounded-t-2xl bg-card p-0 text-foreground backdrop:bg-black/40"
      >
        <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 id="titulo-reporte" className="text-lg font-bold">
                ¿Cómo está ahora?
              </h2>
              <p className="text-sm text-muted">{lugar.nombre}</p>
            </div>
            <button
              type="button"
              onClick={cerrar}
              aria-label="Cerrar"
              className="-m-2 inline-flex size-11 items-center justify-center rounded-full"
            >
              <X aria-hidden size={22} />
            </button>
          </div>

          {envio === "ok" ? (
            <p role="status" className="rounded-xl bg-libre-bg p-4 text-center font-semibold text-libre">
              Gracias, actualizado.
            </p>
          ) : envio === "cooldown" ? (
            <Aviso texto="Ya reportaste este lugar hace poco. Puedes volver a hacerlo en unos minutos." onCerrar={cerrar} />
          ) : envio === "error" ? (
            <Aviso texto="No pudimos enviar tu reporte. Revisa tu conexión e intenta de nuevo." onCerrar={() => setEnvio("elegir")} boton="Reintentar" />
          ) : (
            <div className="flex flex-col gap-2">
              {OPCIONES.map((o) => {
                const Icono = ICONOS_ESTADO[o.nivel];
                return (
                  <button
                    key={o.nivel}
                    type="button"
                    disabled={envio === "enviando"}
                    onClick={() => reportar(o.nivel)}
                    className={`flex min-h-16 items-center gap-3 rounded-xl px-4 text-left disabled:opacity-60 ${ESTILOS_ESTADO[o.nivel]}`}
                  >
                    <Icono aria-hidden size={28} strokeWidth={2.5} className="shrink-0" />
                    <span>
                      <span className="block text-lg font-bold">{o.texto}</span>
                      <span className="block text-sm">{o.detalle}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}

function Aviso({ texto, onCerrar, boton = "Entendido" }: { texto: string; onCerrar: () => void; boton?: string }) {
  return (
    <div role="status" className="flex flex-col gap-3">
      <p className="rounded-xl bg-sin-info-bg p-4 text-sin-info">{texto}</p>
      <button type="button" onClick={onCerrar} className="min-h-12 rounded-xl border border-foreground font-semibold">
        {boton}
      </button>
    </div>
  );
}
