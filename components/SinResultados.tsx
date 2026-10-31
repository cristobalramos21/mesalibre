"use client";

import { GRUPO_RANGOS } from "@/lib/config";
import { etiquetaFiltro, type Filtro } from "@/lib/filtros";

// Estado vacío: sugiere qué filtro quitar (F4).
export function SinResultados({
  mensaje,
  sugerencia,
  grupoLabel,
  onQuitar,
}: {
  mensaje: string;
  sugerencia: { filtro: Filtro; cantidad: number } | null;
  grupoLabel: string;
  onQuitar: (f: Filtro) => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-4">
      <p className="font-medium">{mensaje}</p>
      {sugerencia ? (
        <button
          type="button"
          onClick={() => onQuitar(sugerencia.filtro)}
          className="mt-3 min-h-11 rounded-lg border border-foreground px-4 text-sm font-semibold"
        >
          Quitar «{etiquetaFiltro(sugerencia.filtro)}» ({sugerencia.cantidad}{" "}
          {sugerencia.cantidad === 1 ? "lugar" : "lugares"})
        </button>
      ) : (
        grupoLabel !== GRUPO_RANGOS[0].label && (
          <p className="mt-1 text-sm text-muted">Prueba con un grupo más chico que {grupoLabel}.</p>
        )
      )}
    </div>
  );
}
