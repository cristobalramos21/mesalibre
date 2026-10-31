import type { Lugar } from "./tipos";

export type Filtro = "techado" | "con_sillas" | "microondas_cerca";

export const FILTROS: { id: Filtro; label: string }[] = [
  { id: "techado", label: "Techado" },
  { id: "con_sillas", label: "Mesa con sillas" },
  { id: "microondas_cerca", label: "Microondas cerca" },
];

export function etiquetaFiltro(f: Filtro): string {
  return FILTROS.find((x) => x.id === f)!.label;
}

function cumple(lugar: Lugar, f: Filtro): boolean {
  if (f === "con_sillas") return lugar.tiene_mesa && lugar.con_sillas;
  return lugar[f];
}

// F3 + F4: cabe el grupo y cumple todos los filtros (AND).
export function esCompatible(lugar: Lugar, minGrupo: number, filtros: Filtro[]): boolean {
  return lugar.capacidad_personas >= minGrupo && filtros.every((f) => cumple(lugar, f));
}

// Estado vacío: qué filtro quitar para ver más lugares (el que más agrega).
export function sugerirQuitar(
  lugares: Lugar[],
  minGrupo: number,
  filtros: Filtro[],
): { filtro: Filtro; cantidad: number } | null {
  let mejor: { filtro: Filtro; cantidad: number } | null = null;
  for (const f of filtros) {
    const resto = filtros.filter((x) => x !== f);
    const cantidad = lugares.filter((l) => esCompatible(l, minGrupo, resto)).length;
    if (cantidad > 0 && (!mejor || cantidad > mejor.cantidad)) mejor = { filtro: f, cantidad };
  }
  return mejor;
}
