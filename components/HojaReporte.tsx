"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Camera, LoaderCircle, Megaphone, X } from "lucide-react";
import { ESTILOS_ESTADO, ICONOS_ESTADO } from "@/components/EstadoBadge";
import { FOTO_VIGENCIA_MIN } from "@/lib/config";
import { obtenerDeviceId } from "@/lib/device";
import { comprimirFoto, subirFoto } from "@/lib/fotos";
import { getSupabase } from "@/lib/supabase";
import type { Lugar, NivelOcupacion } from "@/lib/tipos";

const OPCIONES: { nivel: NivelOcupacion; texto: string; detalle: string }[] = [
  { nivel: "libre", texto: "Libre", detalle: "Hay mesas para grupos" },
  { nivel: "pocas", texto: "Pocas mesas", detalle: "1 o 2 mesas, o compartir" },
  { nivel: "lleno", texto: "Lleno", detalle: "No hay dónde sentarse" },
];

type Envio = "elegir" | "enviando" | "ok" | "cooldown" | "error" | "error-foto";

// F10 · Botón "¿Cómo está ahora?" + hoja inferior para reportar (<dialog> nativo).
// variante "destacado": llamado principal cuando el lugar no tiene información reciente.
export function HojaReporte({
  lugar,
  onReportado,
  variante = "secundario",
  etiqueta = "¿Cómo está ahora?",
}: {
  lugar: Lugar;
  onReportado: () => void;
  variante?: "secundario" | "destacado";
  etiqueta?: string;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();
  // Cambia en cada apertura para que las opciones partan de cero.
  const [apertura, setApertura] = useState(0);

  const abrir = () => {
    setApertura((n) => n + 1);
    dialogo.current?.showModal();
  };
  const cerrar = () => dialogo.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className={`inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-3 font-semibold ${
          variante === "destacado" ? "bg-foreground text-background" : "border border-foreground bg-card"
        }`}
      >
        <Megaphone aria-hidden size={18} />
        {etiqueta}
      </button>

      <dialog
        ref={dialogo}
        aria-labelledby={idTitulo}
        onClick={(e) => e.target === dialogo.current && cerrar()}
        className="fixed inset-x-0 top-auto bottom-0 m-0 mx-auto w-full max-w-[480px] rounded-t-2xl bg-card p-0 text-foreground backdrop:bg-black/40"
      >
        <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 id={idTitulo} className="text-lg font-bold">
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

          <OpcionesReporte
            key={apertura}
            lugar={lugar}
            onReportado={() => {
              onReportado();
              setTimeout(cerrar, 1500);
            }}
            onCerrar={cerrar}
          />
        </div>
      </dialog>
    </>
  );
}

// Los 3 botones de reporte con sus mensajes. compacto: en una fila (F21, tras "Llegué").
// Fuera del modo compacto se puede adjuntar una foto opcional antes de tocar el nivel: se
// comprime al elegirla, así el toque en el nivel sigue enviando el reporte de una vez.
export function OpcionesReporte({
  lugar,
  onReportado,
  onCerrar,
  compacto = false,
}: {
  lugar: Lugar;
  onReportado: () => void;
  onCerrar: () => void;
  compacto?: boolean;
}) {
  const [envio, setEnvio] = useState<Envio>("elegir");
  const [foto, setFoto] = useState<FotoElegida>({ fase: "nada" });
  const [nivelPendiente, setNivelPendiente] = useState<NivelOcupacion | null>(null);

  const reportar = async (nivel: NivelOcupacion, conFoto = true) => {
    setEnvio("enviando");
    setNivelPendiente(nivel);
    let rutaFoto: string | null = null;
    if (conFoto && foto.fase === "lista") {
      try {
        rutaFoto = await subirFoto(foto.blob);
      } catch (e) {
        console.error("subirFoto:", e);
        setEnvio("error-foto");
        return;
      }
    }
    const { data, error } = await getSupabase().rpc("insert_reporte", {
      p_lugar_id: lugar.id,
      p_nivel: nivel,
      p_device_id: obtenerDeviceId(),
      ...(rutaFoto ? { p_foto_path: rutaFoto } : {}),
    });
    if (error) {
      console.error("insert_reporte:", error);
      setEnvio(error.hint === "foto_invalida" ? "error-foto" : "error");
      return;
    }
    if (data === "cooldown") {
      setEnvio("cooldown");
      return;
    }
    setEnvio("ok");
    onReportado();
  };

  if (envio === "ok") {
    return (
      <p role="status" className="rounded-xl bg-libre-bg p-4 text-center font-semibold text-libre">
        Gracias, actualizado.
      </p>
    );
  }
  if (envio === "cooldown") {
    return <Aviso texto="Ya reportaste este lugar hace poco. Puedes volver a hacerlo en unos minutos." onCerrar={onCerrar} />;
  }
  if (envio === "error") {
    return <Aviso texto="No pudimos enviar tu reporte. Revisa tu conexión e intenta de nuevo." onCerrar={() => setEnvio("elegir")} boton="Reintentar" />;
  }
  if (envio === "error-foto" && nivelPendiente) {
    return (
      <div role="status" className="flex flex-col gap-3">
        <p className="rounded-xl bg-sin-info-bg p-4 text-sin-info">
          No pudimos subir la foto. Puedes enviar el reporte sin foto o intentar de nuevo.
        </p>
        <button
          type="button"
          onClick={() => reportar(nivelPendiente, false)}
          className="min-h-12 rounded-xl bg-foreground font-semibold text-background"
        >
          Enviar sin foto
        </button>
        <button
          type="button"
          onClick={() => reportar(nivelPendiente)}
          className="min-h-12 rounded-xl border border-foreground font-semibold"
        >
          Reintentar con foto
        </button>
      </div>
    );
  }

  const enviando = envio === "enviando";
  return (
    <div className="flex flex-col gap-3">
      {!compacto && <ElegirFoto foto={foto} onCambio={setFoto} deshabilitado={enviando} />}
      <div className={compacto ? "grid grid-cols-3 gap-2" : "flex flex-col gap-2"}>
        {OPCIONES.map((o) => {
          const Icono = ICONOS_ESTADO[o.nivel];
          return (
            <button
              key={o.nivel}
              type="button"
              disabled={enviando || foto.fase === "procesando"}
              onClick={() => reportar(o.nivel)}
              className={`flex items-center rounded-xl disabled:opacity-60 ${ESTILOS_ESTADO[o.nivel]} ${
                compacto ? "min-h-14 flex-col justify-center gap-0.5 px-1 font-bold" : "min-h-16 gap-3 px-4 text-left"
              }`}
            >
              <Icono aria-hidden size={compacto ? 22 : 28} strokeWidth={2.5} className="shrink-0" />
              {compacto ? (
                <span className="text-sm">{o.texto}</span>
              ) : (
                <span>
                  <span className="block text-lg font-bold">{o.texto}</span>
                  <span className="block text-sm">{o.detalle}</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
      {enviando && (
        <p role="status" className="inline-flex items-center justify-center gap-2 text-sm text-muted">
          <LoaderCircle aria-hidden size={16} className="animate-spin" />
          {foto.fase === "lista" ? "Subiendo foto y enviando…" : "Enviando…"}
        </p>
      )}
    </div>
  );
}

type FotoElegida =
  | { fase: "nada" }
  | { fase: "procesando" }
  | { fase: "lista"; blob: Blob; vista: string }
  | { fase: "error" };

// Foto opcional: cámara trasera en el celular, galería o archivo en el computador.
function ElegirFoto({
  foto,
  onCambio,
  deshabilitado,
}: {
  foto: FotoElegida;
  onCambio: (f: FotoElegida) => void;
  deshabilitado: boolean;
}) {
  const entrada = useRef<HTMLInputElement>(null);

  // Libera la vista previa al cambiarla o al cerrar.
  useEffect(() => {
    if (foto.fase !== "lista") return;
    return () => URL.revokeObjectURL(foto.vista);
  }, [foto]);

  const elegir = async (archivo: File | undefined) => {
    if (!archivo) return;
    onCambio({ fase: "procesando" });
    try {
      const blob = await comprimirFoto(archivo);
      onCambio({ fase: "lista", blob, vista: URL.createObjectURL(blob) });
    } catch (e) {
      console.error("comprimirFoto:", e);
      onCambio({ fase: "error" });
    } finally {
      if (entrada.current) entrada.current.value = "";
    }
  };

  return (
    <div>
      <input
        ref={entrada}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => elegir(e.target.files?.[0])}
      />
      {foto.fase === "lista" ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- blob local, next/image no aplica */}
          <img src={foto.vista} alt="Foto que vas a enviar" className="size-16 rounded-lg object-cover" />
          <button
            type="button"
            disabled={deshabilitado}
            onClick={() => onCambio({ fase: "nada" })}
            className="min-h-11 rounded-lg border border-border px-3 text-sm font-semibold disabled:opacity-60"
          >
            Quitar foto
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={deshabilitado || foto.fase === "procesando"}
          onClick={() => entrada.current?.click()}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold disabled:opacity-60"
        >
          {foto.fase === "procesando" ? (
            <LoaderCircle aria-hidden size={18} className="animate-spin" />
          ) : (
            <Camera aria-hidden size={18} />
          )}
          {foto.fase === "procesando" ? "Preparando foto…" : "Agregar foto (opcional)"}
        </button>
      )}
      <p className="mt-1 text-xs text-muted">
        {foto.fase === "error"
          ? "No pudimos usar esa imagen. Prueba con otra o reporta sin foto."
          : `Sin caras, por favor: muestra las mesas. Se ve ${FOTO_VIGENCIA_MIN} min y se borra al día siguiente.`}
      </p>
    </div>
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
