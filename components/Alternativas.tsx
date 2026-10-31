import Link from "next/link";
import { ChevronRight, Footprints } from "lucide-react";
import { EstadoBadge } from "@/components/EstadoBadge";
import type { Alternativa } from "@/lib/alternativas";
import { minutosCaminando } from "@/lib/geo";

// F6 · Tarjetas: nombre, "X min caminando", estado con antigüedad, botón "Ver".
export function ListaAlternativas({ alternativas }: { alternativas: Alternativa[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {alternativas.map(({ lugar, estado, distanciaM, sinConfirmar }) => (
        <li key={lugar.id}>
          <Link
            href={`/lugar/${lugar.slug}`}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 active:bg-border/40"
          >
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{lugar.nombre}</p>
              <p className="mt-0.5 inline-flex items-center gap-1 text-sm text-muted">
                <Footprints aria-hidden size={14} />
                {minutosCaminando(distanciaM)} min caminando
              </p>
              <div className="mt-1.5">
                <EstadoBadge estado={estado} alinear="izquierda" />
              </div>
              {sinConfirmar && <p className="mt-1 text-xs font-medium text-muted">Sin confirmar</p>}
            </div>
            <span className="inline-flex min-h-11 shrink-0 items-center gap-0.5 rounded-lg bg-foreground px-3 text-sm font-semibold text-background">
              Ver <ChevronRight aria-hidden size={16} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
