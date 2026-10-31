"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Armchair,
  ArrowLeft,
  Microwave,
  Star,
  Sun,
  TriangleAlert,
  Umbrella,
  Users,
  Utensils,
} from "lucide-react";
import { ListaAlternativas } from "@/components/Alternativas";
import { EstadoBadge } from "@/components/EstadoBadge";
import { HojaReporte } from "@/components/HojaReporte";
import { SinResultados } from "@/components/SinResultados";
import { calcularAlternativas } from "@/lib/alternativas";
import { describirEstado } from "@/lib/estado";
import { useAhora, useEstadosEnVivo } from "@/lib/en-vivo";
import { etiquetaFiltro, sugerirQuitar } from "@/lib/filtros";
import { useFiltros, useGrupo, useLugarHabitual } from "@/lib/preferencias";
import type { EstadoActual, Lugar } from "@/lib/tipos";

// F5 · Orden: nombre + zona → estado → alternativas (si lleno o no cabe) → capacidad →
// condiciones → aviso → acciones (principal abajo).
export function Ficha({
  lugar,
  lugares,
  estadosIniciales,
  leidoEnMs,
  demo,
}: {
  lugar: Lugar;
  lugares: Lugar[];
  estadosIniciales: EstadoActual[];
  leidoEnMs: number;
  demo: boolean;
}) {
  const { estados, refrescar } = useEstadosEnVivo(estadosIniciales, demo);
  const ahora = useAhora(leidoEnMs);
  const [habitualSlug, setHabitual] = useLugarHabitual();
  const [grupo] = useGrupo();
  const [filtros, alternarFiltro] = useFiltros();

  const porLugar = useMemo(() => new Map(estados.map((e) => [e.lugar_id, e])), [estados]);
  const estado = describirEstado(porLugar.get(lugar.id), ahora);
  const noCabe = lugar.capacidad_personas < grupo.min;
  const mostrarAlternativas = noCabe || estado.tipo === "lleno";
  const alternativas = mostrarAlternativas
    ? calcularAlternativas({ actual: lugar, lugares, estados: porLugar, minGrupo: grupo.min, filtros, ahoraMs: ahora })
    : [];
  const esHabitual = habitualSlug === lugar.slug;
  const avisoVigente =
    lugar.aviso_texto && (!lugar.aviso_hasta || new Date(lugar.aviso_hasta).getTime() > ahora);

  return (
    <div className="flex flex-1 flex-col">
      <Link href="/" className="-ml-2 mt-2 inline-flex min-h-11 w-fit items-center gap-1 px-2 text-sm font-medium text-muted">
        <ArrowLeft aria-hidden size={18} /> Inicio
      </Link>

      <header className="mt-1">
        <h1 className="text-3xl font-bold leading-tight">{lugar.nombre}</h1>
        {lugar.zona && <p className="text-muted">{lugar.zona}</p>}
      </header>

      <section aria-label="Estado ahora" className="mt-4">
        <EstadoBadge estado={estado} grande alinear="izquierda" />
      </section>

      {mostrarAlternativas && (
        <section id="alternativas" aria-labelledby="titulo-alternativas" className="mt-6 scroll-mt-4">
          <h2 id="titulo-alternativas" className="mb-1 text-lg font-bold">
            {noCabe ? `No cabe un grupo de ${grupo.label}. Prueba aquí cerca:` : "Está lleno. Prueba aquí cerca:"}
          </h2>
          {filtros.length > 0 && (
            <p className="mb-2 text-sm text-muted">
              Grupo de {grupo.label} · {filtros.map(etiquetaFiltro).join(" · ")}
            </p>
          )}
          {alternativas.length > 0 ? (
            <ListaAlternativas alternativas={alternativas} />
          ) : (
            <SinResultados
              mensaje="No encontramos otros lugares con espacio para tu grupo y filtros."
              sugerencia={sugerirQuitar(lugares.filter((l) => l.id !== lugar.id), grupo.min, filtros)}
              grupoLabel={grupo.label}
              onQuitar={alternarFiltro}
            />
          )}
        </section>
      )}

      <section aria-label="Capacidad" className="mt-6 flex items-center gap-2 text-base">
        <Users aria-hidden size={20} className="shrink-0 text-muted" />
        <p>
          {lugar.tiene_mesa
            ? `${lugar.num_mesas ? `~${lugar.num_mesas} mesas · ` : ""}grupos de hasta ${lugar.capacidad_personas}`
            : `Sin mesas · grupos de hasta ${lugar.capacidad_personas}`}
        </p>
      </section>

      <section aria-label="Condiciones" className="mt-3">
        <ul className="flex flex-col gap-2 text-base">
          <Condicion icono={lugar.techado ? Umbrella : Sun} texto={lugar.techado ? "Techado" : "Al aire libre"} />
          <Condicion
            icono={lugar.tiene_mesa ? Armchair : Utensils}
            texto={!lugar.tiene_mesa ? "Sin mesas ni sillas" : lugar.con_sillas ? "Mesa con sillas" : "Mesa sin sillas (bancas)"}
          />
          <Condicion
            icono={Microwave}
            texto={
              lugar.microondas_cerca
                ? `Microondas cerca${lugar.dist_microondas_m ? ` (~${lugar.dist_microondas_m} m)` : ""}`
                : "Sin microondas cerca"
            }
          />
        </ul>
      </section>

      {avisoVigente && (
        <p role="note" className="mt-4 flex gap-2 rounded-xl bg-pocas-bg p-3 text-pocas">
          <TriangleAlert aria-hidden size={20} className="mt-0.5 shrink-0" />
          {lugar.aviso_texto}
        </p>
      )}

      <div className="sticky bottom-0 -mx-4 mt-auto border-t border-border bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mb-2 flex gap-2">
          <HojaReporte lugar={lugar} onReportado={refrescar} />
          <button
            type="button"
            aria-pressed={esHabitual}
            onClick={() => setHabitual(esHabitual ? null : lugar.slug)}
            className={`inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border px-3 font-semibold ${
              esHabitual ? "border-pocas bg-pocas-bg text-pocas" : "border-foreground bg-card"
            }`}
          >
            <Star aria-hidden size={18} className={esHabitual ? "fill-current" : ""} />
            {esHabitual ? "Es tu lugar" : "Es mi lugar"}
          </button>
        </div>
        <Link
          href={`/lugar/${lugar.slug}/juntarnos`}
          className="flex min-h-13 w-full items-center justify-center rounded-xl bg-foreground text-lg font-bold text-background"
        >
          Juntarnos aquí
        </Link>
      </div>
    </div>
  );
}

function Condicion({ icono: Icono, texto }: { icono: typeof Sun; texto: string }) {
  return (
    <li className="flex items-center gap-2">
      <Icono aria-hidden size={20} className="shrink-0 text-muted" />
      {texto}
    </li>
  );
}
