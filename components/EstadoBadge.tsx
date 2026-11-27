import { CircleAlert, CircleCheck, CircleHelp, CircleX, Clock, History, Users } from "lucide-react";
import type { EstadoDescrito, TipoEstado } from "@/lib/estado";

// Estado = color + ícono + texto, siempre con antigüedad (O4).
export const ESTILOS_ESTADO: Record<TipoEstado, string> = {
  libre: "bg-libre-bg text-libre",
  pocas: "bg-pocas-bg text-pocas",
  lleno: "bg-lleno-bg text-lleno",
  "sin-info": "bg-sin-info-bg text-sin-info",
};

export const ICONOS_ESTADO = {
  libre: CircleCheck,
  pocas: CircleAlert,
  lleno: CircleX,
  "sin-info": CircleHelp,
} satisfies Record<TipoEstado, unknown>;

// Sin información reciente: debajo va lo último que se sabe, con estilo de dato histórico
// (gris, cursiva, ícono de reloj) para no confundirlo con un estado en vivo (CLAUDE.md §8).
// En listas (grande = false) cabe una sola línea: el último reporte o, si no hay, el patrón.
export function EstadoBadge({
  estado,
  grande = false,
  alinear = "derecha",
}: {
  estado: EstadoDescrito;
  grande?: boolean;
  alinear?: "derecha" | "izquierda";
}) {
  const Icono = ICONOS_ESTADO[estado.tipo];
  const lineaUltimo = estado.ultimo && `Último reporte: ${estado.ultimo.texto} · ${estado.ultimo.antiguedad}`;
  const lineaPatron = estado.patron && `Estimado para esta hora: ${estado.patron.texto}`;
  const historico = grande
    ? [lineaUltimo && { icono: History, texto: lineaUltimo }, lineaPatron && { icono: Clock, texto: lineaPatron }]
    : [lineaUltimo ? { icono: History, texto: lineaUltimo } : lineaPatron && { icono: Clock, texto: lineaPatron }];

  return (
    <div
      className={`flex flex-col gap-0.5 ${alinear === "derecha" ? "items-end text-right" : "items-start"}`}
    >
      <span
        className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${ESTILOS_ESTADO[estado.tipo]} ${
          grande ? "px-3.5 py-1.5 text-lg" : "px-2.5 py-1 text-sm"
        }`}
      >
        <Icono aria-hidden size={grande ? 22 : 16} strokeWidth={2.5} className="shrink-0" />
        {estado.texto}
      </span>
      {estado.antiguedad && (
        <span className={grande ? "text-sm text-muted" : "text-xs text-muted"}>
          {estado.reportadoComo ? `Reportado: ${estado.reportadoComo} ${estado.antiguedad}` : `Reportado ${estado.antiguedad}`}
        </span>
      )}
      {historico.map(
        (linea) =>
          linea && (
            <span
              key={linea.texto}
              className={`inline-flex items-center gap-1 italic text-muted ${grande ? "text-sm" : "text-xs"}`}
            >
              <linea.icono aria-hidden size={grande ? 15 : 12} className="shrink-0" />
              {linea.texto}
            </span>
          ),
      )}
      {estado.enCamino && (
        <span
          className={`inline-flex items-center gap-1 font-medium text-foreground ${grande ? "text-sm" : "text-xs"}`}
        >
          <Users aria-hidden size={grande ? 16 : 13} className="shrink-0" />
          {estado.enCamino}
        </span>
      )}
    </div>
  );
}
