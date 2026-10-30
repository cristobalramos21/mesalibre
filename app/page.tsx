import { Suspense } from "react";
import { connection } from "next/server";
import { EstadoBadge } from "@/components/EstadoBadge";
import { describirEstado } from "@/lib/estado";
import { cargarLugaresConEstado } from "@/lib/lugares";

export default function Inicio() {
  return (
    <>
      <header className="pt-6 pb-4">
        <h1 className="text-2xl font-bold tracking-tight">Mesa Libre</h1>
        <p className="text-muted">¿Hay mesa para tu grupo? Revísalo antes de caminar.</p>
      </header>
      <Suspense fallback={<ListaCargando />}>
        <ListaLugares />
      </Suspense>
    </>
  );
}

// El estado cambia minuto a minuto: se lee en cada request, nunca desde caché.
async function ListaLugares() {
  await connection();
  const resultado = await cargarLugaresConEstado();

  if (!resultado.ok) {
    return (
      <div role="alert" className="rounded-xl border border-lleno/30 bg-lleno-bg p-4 text-lleno">
        <p className="font-semibold">{resultado.mensaje}</p>
        {resultado.detalle && (
          <details className="mt-2 text-sm">
            <summary className="cursor-pointer">Detalle técnico</summary>
            <p className="mt-1 break-words">{resultado.detalle}</p>
          </details>
        )}
      </div>
    );
  }

  if (resultado.lugares.length === 0) {
    return <p className="text-muted">Todavía no hay lugares cargados.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {resultado.lugares.map((lugar) => (
        <li
          key={lugar.id}
          className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
        >
          <div className="min-w-0">
            <p className="font-semibold">{lugar.nombre}</p>
            {lugar.zona && <p className="text-sm text-muted">{lugar.zona}</p>}
          </div>
          <EstadoBadge estado={describirEstado(lugar.estado, resultado.leidoEnMs)} />
        </li>
      ))}
    </ul>
  );
}

function ListaCargando() {
  return (
    <ul className="flex flex-col gap-2" aria-busy="true" aria-label="Cargando lugares">
      {Array.from({ length: 5 }, (_, i) => (
        <li key={i} className="h-16 animate-pulse rounded-xl bg-border/60" />
      ))}
    </ul>
  );
}
