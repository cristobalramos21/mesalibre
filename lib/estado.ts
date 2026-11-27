import { FRESHNESS_MIN } from "./config";
import type { EstadoActual, NivelOcupacion } from "./tipos";

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
  // Solo cuando no hay información reciente (tipo "sin-info"): lo último que se sabe.
  ultimo: { nivel: NivelOcupacion; texto: string; antiguedad: string } | null; // último reporte de hoy
  patron: { nivel: NivelOcupacion; texto: string } | null; // F12: cómo suele estar a esta hora
  // Nivel reportado cuando lo que se muestra es otro por la demanda en camino (F20): explica la causa.
  reportadoComo: string | null;
};

const SIN_INFO = "Sin información reciente";

export const TEXTO_NIVEL: Record<NivelOcupacion, string> = {
  libre: "Libre",
  pocas: "Pocas mesas",
  lleno: "Lleno",
};

// "hace un momento", "hace 7 min", "hace 1 h 20 min", "hace 3 h"
export function textoAntiguedad(fechaMs: number, ahoraMs: number): string {
  const min = Math.floor((ahoraMs - fechaMs) / 60_000);
  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  const resto = min % 60;
  return h < 3 && resto >= 5 ? `hace ${h} h ${resto} min` : `hace ${h} h`;
}

// ademas: en la página de un encuentro, que no cuenta a ese mismo grupo.
export function textoEnCamino(n: number, ademas = false): string | null {
  if (n === 0) return null;
  const mas = ademas ? " más" : "";
  return n === 1 ? `1 grupo${mas} va hacia acá` : `${n} grupos${mas} van hacia acá`;
}

// Título del bloque de alternativas, derivado del mismo estado que muestra la etiqueta, para que
// nunca digan cosas distintas (p. ej. etiqueta "Alta demanda" y título "Está lleno").
export function tituloAlternativas(
  estado: EstadoDescrito,
  opciones: { noCabe?: string | null; sinMesa?: boolean } = {},
): string {
  if (opciones.noCabe) return `No cabe un grupo de ${opciones.noCabe}. Prueba aquí cerca:`;
  if (opciones.sinMesa) return "No hay mesa. Prueba aquí cerca:";
  if (estado.texto === "Lleno") return "Está lleno. Prueba aquí cerca:";
  const causa = estado.enCamino ? `: ${estado.enCamino}` : "";
  if (estado.texto === "Alta demanda") return `Alta demanda${causa}. Prueba aquí cerca:`;
  return `Se está llenando${causa}. Plan B aquí cerca:`;
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
    // Sin información reciente: se muestra lo último que se sabe y el patrón, si existen.
    const ultimoMs = estado?.ultimo_en ? new Date(estado.ultimo_en).getTime() : null;
    const ultimo =
      estado?.ultimo_nivel && ultimoMs !== null
        ? {
            nivel: estado.ultimo_nivel,
            texto: TEXTO_NIVEL[estado.ultimo_nivel],
            antiguedad: textoAntiguedad(ultimoMs, ahoraMs),
          }
        : null;
    const patron = estado?.patron_nivel
      ? { nivel: estado.patron_nivel, texto: TEXTO_NIVEL[estado.patron_nivel].toLowerCase() }
      : null;
    return { tipo: "sin-info", texto: SIN_INFO, antiguedad: null, enCamino, grupos, reportadoMs: null, rango: 3, ultimo, patron, reportadoComo: null };
  }

  const base = {
    antiguedad: textoAntiguedad(reportadoMs, ahoraMs),
    enCamino,
    grupos,
    reportadoMs,
    ultimo: null,
    patron: null,
    reportadoComo: estado.nivel !== estado.nivel_efectivo ? TEXTO_NIVEL[estado.nivel!].toLowerCase() : null,
  };

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
