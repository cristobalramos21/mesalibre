"use client";

import { GRUPO_RANGOS } from "@/lib/config";
import type { RangoGrupo } from "@/lib/preferencias";

// F3 · Control segmentado de tamaño del grupo.
export function SelectorGrupo({
  grupo,
  onCambiar,
}: {
  grupo: RangoGrupo;
  onCambiar: (label: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-muted">¿Cuántos son?</legend>
      <div className="grid grid-cols-4 gap-1 rounded-xl bg-border/60 p-1">
        {GRUPO_RANGOS.map((r) => {
          const activo = r.label === grupo.label;
          return (
            <button
              key={r.label}
              type="button"
              aria-pressed={activo}
              onClick={() => onCambiar(r.label)}
              className={`min-h-11 rounded-lg text-base font-semibold transition-colors ${
                activo ? "bg-card text-foreground shadow-sm" : "text-muted"
              }`}
            >
              {r.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
