"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ChevronRight, Star } from "lucide-react";
import { ChipsFiltros } from "@/components/ChipsFiltros";
import { EstadoBadge } from "@/components/EstadoBadge";
import { SelectorGrupo } from "@/components/SelectorGrupo";
import { SinResultados } from "@/components/SinResultados";
import { useHidratado } from "@/lib/almacen";
import { LUGARES_COMUNES } from "@/lib/config";
import { describirEstado, type EstadoDescrito } from "@/lib/estado";
import { useAhora, useEstadosEnVivo } from "@/lib/en-vivo";
import { esCompatible, sugerirQuitar } from "@/lib/filtros";
import { distanciaM } from "@/lib/geo";
import { useFiltros, useGrupo, useLugarHabitual } from "@/lib/preferencias";
import type { EstadoActual, Lugar } from "@/lib/tipos";

export function Inicio({
  lugares,
  estadosIniciales,
  leidoEnMs,
  demo,
}: {
  lugares: Lugar[];
  estadosIniciales: EstadoActual[];
  leidoEnMs: number;
  demo: boolean;
}) {
  const hidratado = useHidratado();
  const { estados } = useEstadosEnVivo(estadosIniciales, demo);
  const ahora = useAhora(leidoEnMs);
  const [habitualSlug] = useLugarHabitual();
  const [grupo, setGrupo] = useGrupo();
  const [filtros, alternarFiltro] = useFiltros();

  const porLugar = useMemo(() => new Map(estados.map((e) => [e.lugar_id, e])), [estados]);
  const habitual = lugares.find((l) => l.slug === habitualSlug);

  // Lista: por estado y luego cercanía al lugar habitual (sin habitual: por nombre).
  const lista = lugares
    .filter((l) => l.id !== habitual?.id && esCompatible(l, grupo.min, filtros))
    .map((l) => ({
      lugar: l,
      estado: describirEstado(porLugar.get(l.id), ahora),
      distancia: habitual ? distanciaM(habitual, l) : 0,
    }))
    .sort(
      (a, b) =>
        a.estado.rango - b.estado.rango ||
        a.distancia - b.distancia ||
        a.lugar.nombre.localeCompare(b.lugar.nombre, "es"),
    );

  return (
    <div className="flex flex-col gap-5">
      {!hidratado ? (
        <div className="h-36 animate-pulse rounded-2xl bg-border/60" aria-hidden />
      ) : habitual ? (
        <TarjetaMiLugar
          lugar={habitual}
          estado={describirEstado(porLugar.get(habitual.id), ahora)}
          noCabe={habitual.capacidad_personas < grupo.min}
          grupoLabel={grupo.label}
        />
      ) : (
        <ElegirHabitual lugares={lugares} />
      )}

      <SelectorGrupo grupo={grupo} onCambiar={setGrupo} />
      <ChipsFiltros activos={filtros} onAlternar={alternarFiltro} />

      <section aria-labelledby="titulo-lista">
        <h2 id="titulo-lista" className="mb-2 text-lg font-bold">
          {habitual ? "Otros lugares" : "Lugares"}
        </h2>
        {lista.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {lista.map(({ lugar, estado }) => (
              <li key={lugar.id}>
                <Link
                  href={`/lugar/${lugar.slug}`}
                  className="flex min-h-16 items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 active:bg-border/40"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{lugar.nombre}</p>
                    {lugar.zona && <p className="text-sm text-muted">{lugar.zona}</p>}
                  </div>
                  <EstadoBadge estado={estado} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <SinResultados
            mensaje={`Ningún lugar coincide con tu grupo (${grupo.label}) y filtros.`}
            sugerencia={sugerirQuitar(
              lugares.filter((l) => l.id !== habitual?.id),
              grupo.min,
              filtros,
            )}
            grupoLabel={grupo.label}
            onQuitar={alternarFiltro}
          />
        )}
      </section>
    </div>
  );
}

function TarjetaMiLugar({
  lugar,
  estado,
  noCabe,
  grupoLabel,
}: {
  lugar: Lugar;
  estado: EstadoDescrito;
  noCabe: boolean;
  grupoLabel: string;
}) {
  const verAlternativas = noCabe || estado.tipo === "lleno";
  return (
    <Link
      href={`/lugar/${lugar.slug}${verAlternativas ? "#alternativas" : ""}`}
      className="block rounded-2xl border-2 border-foreground/80 bg-card p-5 shadow-sm active:bg-border/40"
    >
      <p className="mb-1 inline-flex items-center gap-1 text-sm font-medium text-muted">
        <Star aria-hidden size={14} className="fill-current" /> Mi lugar
      </p>
      <h2 className="text-2xl font-bold leading-tight">{lugar.nombre}</h2>
      {lugar.zona && <p className="text-muted">{lugar.zona}</p>}
      <div className="mt-3">
        <EstadoBadge estado={estado} grande alinear="izquierda" />
      </div>
      {noCabe && (
        <p className="mt-2 text-sm font-semibold text-lleno">
          No cabe un grupo de {grupoLabel} aquí.
        </p>
      )}
      <p className="mt-3 inline-flex items-center gap-1 text-sm font-semibold underline underline-offset-2">
        {verAlternativas ? "Ver alternativas cerca" : "Ver detalle"}
        <ChevronRight aria-hidden size={16} />
      </p>
    </Link>
  );
}

// F2 · Sin lugar guardado: sugerencias que no bloquean.
function ElegirHabitual({ lugares }: { lugares: Lugar[] }) {
  const comunes = LUGARES_COMUNES.map((slug) => lugares.find((l) => l.slug === slug)).filter(
    (l): l is Lugar => !!l,
  );
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-lg font-bold">¿Dónde almuerzas normalmente?</h2>
      <p className="text-sm text-muted">Ábrelo y toca «Es mi lugar» para verlo aquí primero.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {comunes.map((l) => (
          <Link
            key={l.id}
            href={`/lugar/${l.slug}`}
            className="inline-flex min-h-11 items-center rounded-full border border-border bg-background px-4 text-sm font-medium active:bg-border/40"
          >
            {l.nombre}
          </Link>
        ))}
      </div>
    </section>
  );
}
