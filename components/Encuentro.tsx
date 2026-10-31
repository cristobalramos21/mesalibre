"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { CircleCheck, Clock, MapPin, MessageSquareText, Users } from "lucide-react";
import { ListaAlternativas } from "@/components/Alternativas";
import { Compartir } from "@/components/Compartir";
import { EstadoBadge } from "@/components/EstadoBadge";
import { HojaReporte, OpcionesReporte } from "@/components/HojaReporte";
import { CLAVES, guardar, useAlmacen } from "@/lib/almacen";
import { calcularAlternativas } from "@/lib/alternativas";
import { NOMBRE_MAX } from "@/lib/config";
import { recargarEncuentro, type EncuentroEnVivo } from "@/lib/datos";
import { obtenerDeviceId } from "@/lib/device";
import { describirEstado, textoAntiguedad, type EstadoDescrito } from "@/lib/estado";
import { useAhora, useDatosEnVivo, type TablaEnVivo } from "@/lib/en-vivo";
import { formatearHora } from "@/lib/hora";
import { useFiltros } from "@/lib/preferencias";
import { getSupabase } from "@/lib/supabase";
import type { Asistencia, EstadoActual, Lugar } from "@/lib/tipos";

type Props = EncuentroEnVivo & {
  lugar: Lugar;
  lugares: Lugar[];
  leidoEnMs: number;
  demo: boolean;
  nuevo: boolean;
};

// F9 · Página pública del encuentro: lugar, hora, nota, estado en vivo, "Voy", quiénes van,
// reportar y F21 (llegué / llegué y no hay mesa).
export function Encuentro({ encuentro: inicial, asistencias, estados, lugar, lugares, leidoEnMs, demo, nuevo }: Props) {
  const codigo = inicial.codigo;
  const cargar = useCallback(() => recargarEncuentro(codigo, demo), [codigo, demo]);
  const tablas = useMemo<TablaEnVivo[]>(
    () => [
      { table: "reportes" },
      { table: "encuentros" },
      { table: "asistencias", filter: `encuentro_codigo=eq.${codigo}` },
    ],
    [codigo],
  );
  const { datos, refrescar } = useDatosEnVivo<EncuentroEnVivo>(
    { encuentro: inicial, asistencias, estados },
    cargar,
    tablas,
  );
  const { encuentro } = datos;

  const ahora = useAhora(leidoEnMs);
  const [filtros] = useFiltros();
  const [sinMesa, setSinMesa] = useState(false);
  // La BD puede rechazar por vencido antes de que el reloj del cliente llegue a vence_en.
  const [terminadoEnBd, setTerminadoEnBd] = useState(false);

  const porLugar = useMemo(() => new Map<string, EstadoActual>(datos.estados.map((e) => [e.lugar_id, e])), [datos.estados]);
  const estado = describirEstado(porLugar.get(lugar.id), ahora);
  const hora = formatearHora(encuentro.hora);
  const llegadaMs = encuentro.llegada_en ? new Date(encuentro.llegada_en).getTime() : null;
  const terminado = terminadoEnBd || ahora >= new Date(encuentro.vence_en).getTime();

  // Lleno o alta demanda (rango 2: pocas · alta demanda; 4: lleno o tratado como lleno).
  const enRiesgo = estado.rango === 2 || estado.rango === 4;
  // Otro integrante marcó "no hay mesa": quedó un "lleno" reportado desde la llegada.
  const llenoAlLlegar =
    llegadaMs !== null && estado.tipo === "lleno" && (estado.reportadoMs ?? 0) >= llegadaMs - 60_000;
  const mostrarAlternativas = !terminado && (sinMesa || llenoAlLlegar || (llegadaMs === null && enRiesgo));
  const alternativas = mostrarAlternativas
    ? calcularAlternativas({ actual: lugar, lugares, estados: porLugar, minGrupo: encuentro.personas, filtros, ahoraMs: ahora })
    : [];

  return (
    <div className="flex flex-1 flex-col">
      <Link href="/" className="-ml-2 mt-2 inline-flex min-h-11 w-fit items-center px-2 text-sm font-semibold text-muted">
        Mesa Libre
      </Link>

      {nuevo && !terminado && (
        <section aria-labelledby="titulo-creado" className="mb-5 rounded-2xl border border-libre/30 bg-libre-bg p-4">
          <h2 id="titulo-creado" className="mb-1 flex items-center gap-2 text-lg font-bold text-libre">
            <CircleCheck aria-hidden size={22} /> Encuentro creado
          </h2>
          <p className="mb-3 text-libre">Mándale el link a tu grupo. Se abre sin cuenta.</p>
          <Compartir codigo={codigo} lugar={lugar.nombre} hora={hora} />
        </section>
      )}

      <header>
        <p className="text-muted">Almorzamos en</p>
        <h1 className="text-3xl font-bold leading-tight">
          <Link href={`/lugar/${lugar.slug}`} className="underline decoration-border underline-offset-4">
            {lugar.nombre}
          </Link>
        </h1>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-lg">
          <li className="inline-flex items-center gap-1.5 font-semibold">
            <Clock aria-hidden size={20} /> {hora}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Users aria-hidden size={20} className="text-muted" /> {encuentro.personas}{" "}
            {encuentro.personas === 1 ? "persona" : "personas"}
          </li>
          {lugar.zona && lugar.zona !== lugar.nombre && (
            <li className="inline-flex items-center gap-1.5">
              <MapPin aria-hidden size={20} className="text-muted" /> {lugar.zona}
            </li>
          )}
        </ul>
        {encuentro.nota && (
          <p className="mt-3 flex gap-2 rounded-xl bg-card p-3">
            <MessageSquareText aria-hidden size={20} className="mt-0.5 shrink-0 text-muted" />
            {encuentro.nota}
          </p>
        )}
      </header>

      {terminado ? (
        <EncuentroTerminado />
      ) : (
        <>
          <section aria-label="Estado del lugar ahora" className="mt-5 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
            <EstadoBadge estado={estado} grande alinear="izquierda" />
            <div className="flex">
              <HojaReporte lugar={lugar} onReportado={refrescar} />
            </div>
          </section>

          {mostrarAlternativas && (
            <section id="alternativas" aria-labelledby="titulo-alternativas" aria-live="polite" className="mt-5 scroll-mt-4">
              <h2 id="titulo-alternativas" className="mb-2 text-lg font-bold">
                {tituloAlternativas(sinMesa || llenoAlLlegar, estado)}
              </h2>
              {alternativas.length > 0 ? (
                <ListaAlternativas alternativas={alternativas} />
              ) : (
                <p className="rounded-xl border border-dashed border-border bg-card p-4">
                  No encontramos otros lugares con espacio para {encuentro.personas} personas.
                </p>
              )}
            </section>
          )}

          <Asistentes
            codigo={codigo}
            asistencias={datos.asistencias}
            onCambio={refrescar}
            onTerminado={() => setTerminadoEnBd(true)}
          />

          {!nuevo && (
            <section aria-labelledby="titulo-reenviar" className="mt-6">
              <h2 id="titulo-reenviar" className="mb-2 font-bold">
                ¿Falta alguien? Reenvía el link
              </h2>
              <Compartir codigo={codigo} lugar={lugar.nombre} hora={hora} />
            </section>
          )}

          <Llegada
            codigo={codigo}
            lugar={lugar}
            llegadaMs={llegadaMs}
            ahora={ahora}
            onSinMesa={() => {
              setSinMesa(true);
              requestAnimationFrame(() => document.getElementById("alternativas")?.scrollIntoView({ behavior: "smooth" }));
            }}
            onCambio={refrescar}
            onTerminado={() => setTerminadoEnBd(true)}
          />
        </>
      )}
    </div>
  );
}

function tituloAlternativas(sinMesa: boolean, estado: EstadoDescrito): string {
  if (sinMesa) return "No hay mesa. Prueba aquí cerca:";
  if (estado.tipo === "lleno" && estado.texto === "Lleno") return "Se llenó. Prueba aquí cerca:";
  return estado.enCamino
    ? `Se está llenando: ${estado.enCamino.toLowerCase()}. Plan B aquí cerca:`
    : "Se está llenando. Plan B aquí cerca:";
}

function EncuentroTerminado() {
  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-4">
      <h2 className="text-xl font-bold">Este encuentro ya terminó</h2>
      <p className="mt-1 text-muted">Los encuentros duran hasta las 23:59 del día en que se crean.</p>
      <Link
        href="/"
        className="mt-4 inline-flex min-h-12 items-center rounded-xl bg-foreground px-5 font-semibold text-background"
      >
        Ver lugares ahora
      </Link>
    </section>
  );
}

type EnvioVoy = "editar" | "enviando" | "error";

// "Voy" con nombre opcional. Uno por dispositivo: el dispositivo recuerda dónde dijo "Voy"
// (mismo almacenamiento que el device_id) y la BD rechaza duplicados (23505).
function Asistentes({
  codigo,
  asistencias,
  onCambio,
  onTerminado,
}: {
  codigo: string;
  asistencias: Asistencia[];
  onCambio: () => void;
  onTerminado: () => void;
}) {
  const guardados = useAlmacen(CLAVES.voy);
  const yaVoy = (guardados ?? "").split(",").includes(codigo);
  const [nombre, setNombre] = useState("");
  const [envio, setEnvio] = useState<EnvioVoy>("editar");

  const marcarVoy = () => {
    const lista = (guardados ?? "").split(",").filter(Boolean);
    guardar(CLAVES.voy, [...lista.filter((c) => c !== codigo), codigo].slice(-30).join(","));
  };

  const voy = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnvio("enviando");
    const { error } = await getSupabase()
      .from("asistencias")
      .insert({ encuentro_codigo: codigo, device_id: obtenerDeviceId(), nombre: nombre.trim() || null });
    if (error && error.code !== "23505") {
      console.error("asistencias:", error);
      // 42501: la policy rechaza encuentros vencidos.
      if (error.code === "42501") onTerminado();
      else setEnvio("error");
      return;
    }
    marcarVoy();
    setEnvio("editar");
    onCambio();
  };

  return (
    <section aria-labelledby="titulo-van" className="mt-6">
      <h2 id="titulo-van" className="mb-2 text-lg font-bold">
        {asistencias.length === 0 ? "¿Vas?" : `Van ${asistencias.length}`}
      </h2>

      {asistencias.length > 0 && (
        <ul aria-label="Quiénes van" className="mb-3 flex flex-wrap gap-2">
          {asistencias.map((a, i) => (
            <li key={`${a.creado_en}-${i}`} className="rounded-full bg-card px-3 py-1.5 font-medium ring-1 ring-border">
              {a.nombre ?? "Alguien"}
            </li>
          ))}
        </ul>
      )}

      {yaVoy ? (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-libre-bg p-3 font-semibold text-libre">
          <CircleCheck aria-hidden size={20} /> Ya estás en la lista
        </p>
      ) : (
        <form onSubmit={voy} className="flex gap-2">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Tu nombre (opcional)</span>
            <input
              type="text"
              value={nombre}
              maxLength={NOMBRE_MAX}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Tu nombre (opcional)"
              autoComplete="given-name"
              className="min-h-12 w-full rounded-xl border border-border bg-card px-3 text-base"
            />
          </label>
          <button
            type="submit"
            disabled={envio === "enviando"}
            className="min-h-12 shrink-0 rounded-xl bg-foreground px-6 text-lg font-bold text-background disabled:opacity-60"
          >
            Voy
          </button>
        </form>
      )}
      {envio === "error" && (
        <p role="alert" className="mt-2 text-sm text-lleno">
          No pudimos anotarte. Revisa tu conexión e intenta de nuevo.
        </p>
      )}
    </section>
  );
}

type EnvioLlegada = "listo" | "enviando" | "error";

// F21 · Ambos botones marcan la llegada (deja de contar como grupo en camino).
// "No hay mesa" además reporta "lleno" (acepta 'cooldown') y muestra alternativas.
// "Llegué" ofrece reportar el estado real con un toque.
function Llegada({
  codigo,
  lugar,
  llegadaMs,
  ahora,
  onSinMesa,
  onCambio,
  onTerminado,
}: {
  codigo: string;
  lugar: Lugar;
  llegadaMs: number | null;
  ahora: number;
  onSinMesa: () => void;
  onCambio: () => void;
  onTerminado: () => void;
}) {
  const [envio, setEnvio] = useState<EnvioLlegada>("listo");
  const [ofrecerReporte, setOfrecerReporte] = useState(false);

  const llegar = async (sinMesa: boolean) => {
    setEnvio("enviando");
    const { error } = await getSupabase().rpc("marcar_llegada", {
      p_codigo: codigo,
      p_device_id: obtenerDeviceId(),
      p_sin_mesa: sinMesa,
    });
    if (error) {
      console.error("marcar_llegada:", error);
      // P0002: el encuentro no existe o ya terminó.
      if (error.code === "P0002") onTerminado();
      else setEnvio("error");
      return;
    }
    setEnvio("listo");
    if (sinMesa) onSinMesa();
    else setOfrecerReporte(true);
    onCambio();
  };

  return (
    <div className="sticky bottom-0 -mx-4 mt-auto border-t border-border bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
      {ofrecerReporte ? (
        <div>
          <p className="mb-2 font-semibold">¿Cómo está {lugar.nombre}?</p>
          <OpcionesReporte
            lugar={lugar}
            onReportado={() => {
              onCambio();
              setTimeout(() => setOfrecerReporte(false), 1500);
            }}
            onCerrar={() => setOfrecerReporte(false)}
            compacto
          />
        </div>
      ) : llegadaMs !== null ? (
        <p role="status" className="flex min-h-12 items-center justify-center gap-2 font-semibold">
          <CircleCheck aria-hidden size={20} className="text-libre" />
          El grupo llegó {textoAntiguedad(llegadaMs, ahora)}
        </p>
      ) : (
        <>
          {envio === "error" && (
            <p role="alert" className="mb-2 text-center text-sm text-lleno">
              No pudimos avisar tu llegada. Intenta de nuevo.
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={envio === "enviando"}
              onClick={() => llegar(false)}
              className="min-h-13 flex-1 rounded-xl bg-foreground px-3 text-lg font-bold text-background disabled:opacity-60"
            >
              Llegué
            </button>
            <button
              type="button"
              disabled={envio === "enviando"}
              onClick={() => llegar(true)}
              className="min-h-13 flex-1 rounded-xl border-2 border-lleno bg-lleno-bg px-3 font-bold leading-tight text-lleno disabled:opacity-60"
            >
              Llegué y no hay mesa
            </button>
          </div>
        </>
      )}
    </div>
  );
}
