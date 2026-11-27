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

// Lugares sin información: primero los que suelen estar libres, luego pocas, luego sin patrón.
const RANGO_PATRON = { libre: 0, pocas: 1, lleno: 2 } as const;
const rangoPatron = (e: EstadoDescrito) => (e.patron ? RANGO_PATRON[e.patron.nivel] : 1.5);

// F6 + F22. Candidatos: activos, ≠ actual, compatibles con grupo y filtros, estado efectivo
// libre o pocas. Si no hay, se ofrecen lugares sin información reciente cuyo patrón (F12) no es
// "lleno", marcados "sin confirmar" (soloConfirmados: no se ofrecen).
// Orden: estado (libre < pocas < pocas·alta demanda) → patrón → grupos en camino → distancia → frescura.
export function calcularAlternativas(opciones: {
  actual: Lugar;
  lugares: Lugar[];
  estados: Map<string, EstadoActual>;
  minGrupo: number;
  filtros: Filtro[];
  ahoraMs: number;
  soloConfirmados?: boolean;
}): Alternativa[] {
  const { actual, lugares, estados, minGrupo, filtros, ahoraMs, soloConfirmados = false } = opciones;

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
    confirmados.length > 0 || soloConfirmados
      ? confirmados.map((c) => ({ ...c, sinConfirmar: false }))
      : candidatos
          .filter((c) => c.estado.rango === 3 && c.estado.patron?.nivel !== "lleno")
          .map((c) => ({ ...c, sinConfirmar: true }));

  return elegidos
    .sort(
      (a, b) =>
        a.estado.rango - b.estado.rango ||
        rangoPatron(a.estado) - rangoPatron(b.estado) ||
        a.estado.grupos - b.estado.grupos ||
        a.distanciaM - b.distanciaM ||
        (b.estado.reportadoMs ?? 0) - (a.estado.reportadoMs ?? 0),
    )
    .slice(0, N_ALTERNATIVAS);
}
