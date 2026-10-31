import { FRESHNESS_MIN } from "./config";
import type { EstadoActual } from "./tipos";

export type TipoEstado = "libre" | "pocas" | "lleno" | "sin-info";

export type EstadoDescrito = {
  tipo: TipoEstado;
  texto: string;
  antiguedad: string | null; // null solo cuando texto ya es "Sin información reciente"
  enCamino: string | null;
  grupos: number;
  reportadoMs: number | null;
  // Orden para listas y alternativas: libre < pocas < pocas·alta demanda < sin info < lleno
  rango: 0 | 1 | 2 | 3 | 4;
};

const SIN_INFO = "Sin información reciente";

export function textoAntiguedad(fechaMs: number, ahoraMs: number): string {
  const min = Math.floor((ahoraMs - fechaMs) / 60_000);
  return min < 1 ? "hace un momento" : `hace ${min} min`;
}

function textoEnCamino(n: number): string | null {
  if (n === 0) return null;
  return n === 1 ? "1 grupo va hacia acá" : `${n} grupos van hacia acá`;
}

// Traduce una fila de estado_lugares al texto que se muestra (F1 + tabla F20 de CLAUDE.md).
// Además de `fresco` (calculado en la BD), se revisa la antigüedad contra ahoraMs para que
// un estado que vence entre dos actualizaciones pase a "Sin información reciente" en pantalla.
export function describirEstado(
  estado: EstadoActual | undefined,
  ahoraMs: number,
): EstadoDescrito {
  const grupos = estado?.grupos_en_camino ?? 0;
  const enCamino = textoEnCamino(grupos);
  const reportadoMs = estado?.reportado_en ? new Date(estado.reportado_en).getTime() : null;
  const vigente =
    !!estado?.fresco &&
    !!estado.nivel &&
    reportadoMs !== null &&
    ahoraMs - reportadoMs < FRESHNESS_MIN * 60_000;

  if (!vigente) {
    // Sin información, pero los grupos en camino se muestran igual.
    return { tipo: "sin-info", texto: SIN_INFO, antiguedad: null, enCamino, grupos, reportadoMs: null, rango: 3 };
  }

  const base = { antiguedad: textoAntiguedad(reportadoMs, ahoraMs), enCamino, grupos, reportadoMs };

  if (estado.nivel === "pocas" && estado.nivel_efectivo === "lleno") {
    return { ...base, tipo: "lleno", texto: "Alta demanda", rango: 4 };
  }
  switch (estado.nivel_efectivo) {
    case "libre":
      return { ...base, tipo: "libre", texto: "Libre", rango: 0 };
    case "pocas":
      return estado.alta_demanda
        ? { ...base, tipo: "pocas", texto: "Pocas mesas · alta demanda", rango: 2 }
        : { ...base, tipo: "pocas", texto: "Pocas mesas", rango: 1 };
    default:
      return { ...base, tipo: "lleno", texto: "Lleno", rango: 4 };
  }
}
