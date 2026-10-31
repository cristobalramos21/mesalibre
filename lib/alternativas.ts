import { ALTERNATIVAS_SIN_MESA, N_ALTERNATIVAS } from "./config";
import { describirEstado, type EstadoDescrito } from "./estado";
import { esCompatible, type Filtro } from "./filtros";
import { distanciaM } from "./geo";
import type { EstadoActual, Lugar } from "./tipos";

export type Alternativa = {
  lugar: Lugar;
  estado: EstadoDescrito;
  distanciaM: number;
  sinConfirmar: boolean;
};

// F6 + F22. Candidatos: activos, ≠ actual, compatibles con grupo y filtros, estado efectivo
// libre o pocas. Si no hay, se ofrecen lugares sin información marcados "sin confirmar"
// (pendiente F12: limitarlos a los con patrón favorable).
// Orden: estado (libre < pocas < pocas·alta demanda) → grupos en camino → distancia → frescura.
export function calcularAlternativas(opciones: {
  actual: Lugar;
  lugares: Lugar[];
  estados: Map<string, EstadoActual>;
  minGrupo: number;
  filtros: Filtro[];
  ahoraMs: number;
}): Alternativa[] {
  const { actual, lugares, estados, minGrupo, filtros, ahoraMs } = opciones;

  const candidatos = lugares
    .filter(
      (l) =>
        l.activo &&
        l.id !== actual.id &&
        (ALTERNATIVAS_SIN_MESA || l.tiene_mesa) &&
        esCompatible(l, minGrupo, filtros),
    )
    .map((l) => ({
      lugar: l,
      estado: describirEstado(estados.get(l.id), ahoraMs),
      distanciaM: distanciaM(actual, l),
    }));

  const confirmados = candidatos.filter((c) => c.estado.rango <= 2);
  const elegidos =
    confirmados.length > 0
      ? confirmados.map((c) => ({ ...c, sinConfirmar: false }))
      : candidatos.filter((c) => c.estado.rango === 3).map((c) => ({ ...c, sinConfirmar: true }));

  return elegidos
    .sort(
      (a, b) =>
        a.estado.rango - b.estado.rango ||
        a.estado.grupos - b.estado.grupos ||
        a.distanciaM - b.distanciaM ||
        (b.estado.reportadoMs ?? 0) - (a.estado.reportadoMs ?? 0),
    )
    .slice(0, N_ALTERNATIVAS);
}
