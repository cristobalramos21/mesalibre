"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, CircleCheck, Clock, LoaderCircle, Minus, Plus, RotateCw, TriangleAlert, Users } from "lucide-react";
import { Compartir } from "@/components/Compartir";
import {
  CREAR_LENTO_MS,
  CREAR_TIMEOUT_MS,
  DEMAND_BEFORE_MIN,
  MAX_ENCUENTROS_HORA,
  NOTA_MAX,
} from "@/lib/config";
import { nuevoUuid, obtenerDeviceId } from "@/lib/device";
import { useAhora, useEstadosEnVivo } from "@/lib/en-vivo";
import { describirEstado, type EstadoDescrito } from "@/lib/estado";
import { aMinutos, atajosHora, horaSantiago, proximaMediaHora } from "@/lib/hora";
import { useGrupo } from "@/lib/preferencias";
import { getSupabase } from "@/lib/supabase";
import type { EstadoActual, Lugar } from "@/lib/tipos";

const PERSONAS_MIN = 1;
const PERSONAS_MAX = 50; // check en encuentros.personas

type Envio =
  | { fase: "editar" }
  | { fase: "enviando"; lento: boolean }
  | { fase: "limite" }
  | { fase: "error"; motivo: "tiempo" | "conexion" }
  | { fase: "creado"; codigo: string };

// F7 · Crear encuentro: hora, personas y nota opcional.
// Al crearse, la confirmación y los botones para compartir aparecen aquí mismo, sin esperar
// a que cargue otra página: el link para el grupo existe apenas la BD responde.
// Si la BD no responde en CREAR_TIMEOUT_MS se ofrece "Reintentar"; el reintento manda la misma
// clave (crear_encuentro es idempotente por device + clave), así no se duplica el encuentro.
export function FormEncuentro({
  lugar,
  estadosIniciales,
  leidoEnMs,
  demo,
}: {
  lugar: Lugar;
  estadosIniciales: EstadoActual[];
  leidoEnMs: number;
  demo: boolean;
}) {
  const ahora = useAhora(leidoEnMs);
  const { estados } = useEstadosEnVivo(estadosIniciales, demo);
  const estadoLugar = useMemo(() => estados.find((e) => e.lugar_id === lugar.id), [estados, lugar.id]);
  const estado = describirEstado(estadoLugar, ahora);
  const [grupo] = useGrupo();
  // leidoEnMs viene del servidor: el valor por defecto es igual en servidor y cliente.
  const [hora, setHora] = useState(() => proximaMediaHora(leidoEnMs));
  // null = todavía sin tocar: se precarga con el grupo guardado (F3), que se lee al hidratar.
  const [personasElegidas, setPersonas] = useState<number | null>(null);
  const [nota, setNota] = useState("");
  const [envio, setEnvio] = useState<Envio>({ fase: "editar" });
  // Clave de idempotencia: se mantiene mientras no cambien los datos del formulario.
  const clave = useRef<{ firma: string; valor: string } | null>(null);

  const personas = personasElegidas ?? grupo.min;
  const cambiarPersonas = (delta: number) =>
    setPersonas(Math.min(PERSONAS_MAX, Math.max(PERSONAS_MIN, personas + delta)));
  const horaPasada = hora !== "" && aMinutos(hora) < aMinutos(horaSantiago(ahora)) - DEMAND_BEFORE_MIN;
  const enviando = envio.fase === "enviando";

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hora || enviando) return;

    const notaLimpia = nota.trim() || null;
    const firma = JSON.stringify([lugar.id, hora, personas, notaLimpia]);
    if (clave.current?.firma !== firma) clave.current = { firma, valor: nuevoUuid() };
    const claveEnvio = clave.current.valor;

    setEnvio({ fase: "enviando", lento: false });
    const control = new AbortController();
    const avisoLento = setTimeout(
      () => setEnvio((v) => (v.fase === "enviando" ? { fase: "enviando", lento: true } : v)),
      CREAR_LENTO_MS,
    );
    const limite = setTimeout(() => control.abort(), CREAR_TIMEOUT_MS);

    try {
      const { data, error } = await getSupabase()
        .rpc("crear_encuentro", {
          p_lugar_id: lugar.id,
          p_hora: hora,
          p_personas: personas,
          p_nota: notaLimpia,
          p_device_id: obtenerDeviceId(),
          p_clave: claveEnvio,
        })
        .abortSignal(control.signal);
      if (error || typeof data !== "string") {
        console.error("crear_encuentro:", error);
        if (control.signal.aborted) setEnvio({ fase: "error", motivo: "tiempo" });
        else if (error?.hint === "limite_encuentros") setEnvio({ fase: "limite" });
        else setEnvio({ fase: "error", motivo: "conexion" });
        return;
      }
      setEnvio({ fase: "creado", codigo: data });
    } catch (err) {
      console.error("crear_encuentro:", err);
      setEnvio({ fase: "error", motivo: control.signal.aborted ? "tiempo" : "conexion" });
    } finally {
      clearTimeout(avisoLento);
      clearTimeout(limite);
    }
  };

  if (envio.fase === "creado") {
    return <EncuentroCreado codigo={envio.codigo} lugar={lugar} hora={hora} personas={personas} />;
  }

  const atajos = atajosHora(ahora);

  return (
    <form onSubmit={crear} className="mt-5 flex flex-1 flex-col">
      <AvisoLugar lugar={lugar} estado={estado} />
      <fieldset disabled={enviando}>
        <legend className="mb-2 text-lg font-bold">¿A qué hora?</legend>
        <div className="flex flex-wrap gap-2">
          {atajos.map((a) => (
            <button
              key={a.etiqueta}
              type="button"
              aria-pressed={hora === a.valor}
              onClick={() => setHora(a.valor)}
              className={`min-h-11 rounded-full border px-4 font-semibold ${
                hora === a.valor ? "border-foreground bg-foreground text-background" : "border-border bg-card"
              }`}
            >
              {a.etiqueta}
            </button>
          ))}
        </div>
        <label className="mt-3 flex items-center gap-3">
          <span className="text-muted">Otra hora</span>
          <input
            type="time"
            required
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            className="min-h-12 rounded-xl border border-border bg-card px-3 text-lg font-semibold"
          />
        </label>
        {horaPasada && (
          <p className="mt-2 text-sm text-pocas">Esa hora ya pasó. Igual puedes crearlo: el link sirve hasta las 23:59 de hoy.</p>
        )}
      </fieldset>

      <fieldset disabled={enviando} className="mt-6">
        <legend className="mb-2 text-lg font-bold">¿Cuántos van?</legend>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => cambiarPersonas(-1)}
            disabled={personas <= PERSONAS_MIN}
            aria-label="Una persona menos"
            className="inline-flex size-12 items-center justify-center rounded-xl border border-foreground bg-card disabled:opacity-40"
          >
            <Minus aria-hidden size={20} />
          </button>
          <output aria-live="polite" className="min-w-16 text-center text-2xl font-bold">
            {personas}
          </output>
          <button
            type="button"
            onClick={() => cambiarPersonas(1)}
            disabled={personas >= PERSONAS_MAX}
            aria-label="Una persona más"
            className="inline-flex size-12 items-center justify-center rounded-xl border border-foreground bg-card disabled:opacity-40"
          >
            <Plus aria-hidden size={20} />
          </button>
          <span className="text-muted">{personas === 1 ? "persona" : "personas"}</span>
        </div>
      </fieldset>

      <label className="mt-6 block">
        <span className="mb-2 block text-lg font-bold">
          Nota <span className="text-base font-normal text-muted">(opcional)</span>
        </span>
        <input
          type="text"
          value={nota}
          maxLength={NOTA_MAX}
          disabled={enviando}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Ej: la mesa larga del fondo"
          className="min-h-12 w-full rounded-xl border border-border bg-card px-3 text-base"
        />
        <span className="mt-1 block text-right text-xs text-muted">
          {nota.length}/{NOTA_MAX}
        </span>
      </label>

      <div className="sticky bottom-0 -mx-4 mt-auto border-t border-border bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        {envio.fase === "limite" && (
          <p role="alert" className="mb-2 rounded-xl bg-pocas-bg p-3 text-sm text-pocas">
            Ya creaste {MAX_ENCUENTROS_HORA} encuentros en la última hora. Espera un rato o busca en el
            chat de tu grupo el link que ya mandaste.
          </p>
        )}
        {envio.fase === "error" && (
          <p role="alert" className="mb-2 rounded-xl bg-lleno-bg p-3 text-sm text-lleno">
            {envio.motivo === "tiempo"
              ? "Esto está tardando demasiado; tu conexión puede estar lenta. "
              : "No pudimos crear el encuentro. Revisa tu conexión. "}
            Toca «Reintentar»: si ya se había creado, no se duplica.
          </p>
        )}
        <p role="status" aria-live="polite" className="sr-only">
          {enviando ? "Creando el encuentro…" : ""}
        </p>
        {enviando && envio.lento && (
          <p className="mb-2 text-center text-sm text-muted">Sigue creando… tu conexión parece lenta.</p>
        )}
        <button
          type="submit"
          disabled={enviando || !hora}
          className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-lg font-bold text-background disabled:opacity-60"
        >
          {enviando ? (
            <>
              <LoaderCircle aria-hidden size={20} className="animate-spin" /> Creando…
            </>
          ) : envio.fase === "error" ? (
            <>
              <RotateCw aria-hidden size={20} /> Reintentar
            </>
          ) : (
            "Crear y compartir"
          )}
        </button>
      </div>
    </form>
  );
}

// H5 · Aviso (no bloquea) si el lugar está sin información reciente, lleno o con alta demanda.
function AvisoLugar({ lugar, estado }: { lugar: Lugar; estado: EstadoDescrito }) {
  let texto: string;
  if (estado.tipo === "sin-info") {
    texto = `Nadie ha reportado ${lugar.nombre} en los últimos minutos${
      estado.patron ? `; estimado para esta hora: ${estado.patron.texto}` : ""
    }.`;
  } else if (estado.texto === "Lleno") {
    texto = `${lugar.nombre} está lleno (reportado ${estado.antiguedad}).`;
  } else if (estado.texto === "Alta demanda") {
    texto = `${lugar.nombre} tiene alta demanda${estado.enCamino ? `: ${estado.enCamino}` : ""}.`;
  } else if (estado.rango === 2) {
    texto = `${lugar.nombre} se está llenando${estado.enCamino ? `: ${estado.enCamino}` : ""}.`;
  } else {
    return null;
  }
  const verCerca = estado.tipo === "lleno" ? `/lugar/${lugar.slug}#alternativas` : estado.tipo === "sin-info" ? `/lugar/${lugar.slug}` : null;

  return (
    <div role="note" className="mb-5 flex gap-2 rounded-xl bg-pocas-bg p-3 text-pocas">
      <TriangleAlert aria-hidden size={20} className="mt-0.5 shrink-0" />
      <div>
        <p>
          <span className="font-semibold">Ojo: </span>
          {texto} Puedes crear el encuentro igual, pero tengan un plan B.
        </p>
        {verCerca && (
          <Link href={verCerca} className="mt-1 inline-flex min-h-11 items-center font-semibold underline underline-offset-2">
            Ver lugares cerca
          </Link>
        )}
      </div>
    </div>
  );
}

// F8 · Confirmación + compartir, mostrada apenas la BD devuelve el código.
function EncuentroCreado({
  codigo,
  lugar,
  hora,
  personas,
}: {
  codigo: string;
  lugar: Lugar;
  hora: string;
  personas: number;
}) {
  const titulo = useRef<HTMLHeadingElement>(null);
  // Lleva el foco (y el lector de pantalla) a la confirmación.
  useEffect(() => titulo.current?.focus(), []);

  return (
    <div className="mt-5 flex flex-1 flex-col">
      <section aria-labelledby="titulo-creado" className="rounded-2xl border border-libre/30 bg-libre-bg p-4">
        <h2
          id="titulo-creado"
          ref={titulo}
          tabIndex={-1}
          className="mb-1 flex items-center gap-2 text-lg font-bold text-libre outline-none"
        >
          <CircleCheck aria-hidden size={22} /> Encuentro creado
        </h2>
        <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-libre">
          <li className="inline-flex items-center gap-1.5 font-semibold">
            <Clock aria-hidden size={18} /> {hora}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Users aria-hidden size={18} /> {personas} {personas === 1 ? "persona" : "personas"}
          </li>
        </ul>
        <p className="mb-3 text-libre">
          Mándale el link a tu grupo. Se abre sin cuenta y muestra en vivo si hay mesa. No reserva la mesa.
        </p>
        <Compartir codigo={codigo} lugar={lugar.nombre} hora={hora} />
      </section>

      <Link
        href={`/e/${codigo}`}
        className="mt-4 inline-flex min-h-12 items-center justify-center gap-1 rounded-xl border border-foreground bg-card px-4 font-semibold"
      >
        Ver el encuentro <ChevronRight aria-hidden size={18} />
      </Link>
      <p className="mt-2 text-center text-sm text-muted">
        Ahí verás quiénes van y podrás avisar cuando lleguen.
      </p>
    </div>
  );
}
