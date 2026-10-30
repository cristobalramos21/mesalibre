import type { EstadoDescrito, TipoEstado } from "@/lib/estado";

// Estado = color + ícono + texto, siempre con antigüedad (O4).
const ESTILOS: Record<TipoEstado, string> = {
  libre: "bg-libre-bg text-libre",
  pocas: "bg-pocas-bg text-pocas",
  lleno: "bg-lleno-bg text-lleno",
  "sin-info": "bg-sin-info-bg text-sin-info",
};

function Icono({ tipo }: { tipo: TipoEstado }) {
  const comun = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 3,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className: "shrink-0",
  };
  switch (tipo) {
    case "libre": // ✓
      return (
        <svg {...comun}>
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      );
    case "pocas": // !
      return (
        <svg {...comun}>
          <path d="M12 5v9" />
          <path d="M12 19h.01" />
        </svg>
      );
    case "lleno": // ✕
      return (
        <svg {...comun}>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      );
    case "sin-info": // ?
      return (
        <svg {...comun} strokeWidth={2.5}>
          <path d="M9.2 9a3 3 0 1 1 4.2 2.8c-.9.4-1.4 1.1-1.4 2v.7" />
          <path d="M12 19h.01" />
        </svg>
      );
  }
}

export function EstadoBadge({ estado }: { estado: EstadoDescrito }) {
  return (
    <div className="flex flex-col items-end gap-0.5 text-right">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold ${ESTILOS[estado.tipo]}`}
      >
        <Icono tipo={estado.tipo} />
        {estado.texto}
      </span>
      {estado.antiguedad && <span className="text-xs text-muted">{estado.antiguedad}</span>}
      {estado.enCamino && <span className="text-xs text-muted">{estado.enCamino}</span>}
    </div>
  );
}
