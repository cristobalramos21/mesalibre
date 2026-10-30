import type { EstadoActual } from "./tipos";

export type TipoEstado = "libre" | "pocas" | "lleno" | "sin-info";

export type EstadoDescrito = {
  tipo: TipoEstado;
  texto: string;
  antiguedad: string | null; // null solo cuando texto ya es "Sin información reciente"
  enCamino: string | null;
};

const SIN_INFO = "Sin información reciente";

export function textoAntiguedad(fechaIso: string, ahoraMs: number): string {
  const min = Math.floor((ahoraMs - new Date(fechaIso).getTime()) / 60_000);
  return min < 1 ? "hace un momento" : `hace ${min} min`;
}

// Traduce una fila de estado_actual al texto que se muestra (F1 + tabla F20 de CLAUDE.md).
export function describirEstado(
  estado: EstadoActual | undefined,
  ahoraMs: number,
): EstadoDescrito {
  if (!estado || !estado.fresco || !estado.nivel || !estado.reportado_en) {
    return { tipo: "sin-info", texto: SIN_INFO, antiguedad: null, enCamino: null };
  }

  const n = estado.grupos_en_camino;
  const enCamino =
    n === 0 ? null : n === 1 ? "1 grupo va hacia acá" : `${n} grupos van hacia acá`;
  const antiguedad = textoAntiguedad(estado.reportado_en, ahoraMs);

  if (estado.nivel === "pocas" && estado.nivel_efectivo === "lleno") {
    return { tipo: "lleno", texto: "Alta demanda", antiguedad, enCamino };
  }

  switch (estado.nivel_efectivo) {
    case "libre":
      return { tipo: "libre", texto: "Libre", antiguedad, enCamino };
    case "pocas":
      return {
        tipo: "pocas",
        texto: estado.alta_demanda ? "Pocas mesas · alta demanda" : "Pocas mesas",
        antiguedad,
        enCamino,
      };
    default:
      return { tipo: "lleno", texto: "Lleno", antiguedad, enCamino };
  }
}
