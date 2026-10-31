"use client";

import { Check } from "lucide-react";
import { FILTROS, type Filtro } from "@/lib/filtros";

// F4 · Chips acumulativos (AND).
export function ChipsFiltros({
  activos,
  onAlternar,
}: {
  activos: Filtro[];
  onAlternar: (f: Filtro) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filtros">
      {FILTROS.map((f) => {
        const activo = activos.includes(f.id);
        return (
          <button
            key={f.id}
            type="button"
            aria-pressed={activo}
            onClick={() => onAlternar(f.id)}
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors ${
              activo
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-card text-foreground"
            }`}
          >
            {activo && <Check aria-hidden size={16} strokeWidth={3} />}
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
