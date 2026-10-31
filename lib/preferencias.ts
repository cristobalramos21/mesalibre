import { useMemo } from "react";
import { CLAVES, guardar, useAlmacen } from "./almacen";
import { GRUPO_DEFAULT, GRUPO_RANGOS } from "./config";
import { FILTROS, type Filtro } from "./filtros";

export type RangoGrupo = (typeof GRUPO_RANGOS)[number];

// F2 · Lugar habitual
export function useLugarHabitual(): [string | null, (slug: string | null) => void] {
  const slug = useAlmacen(CLAVES.lugarHabitual);
  return [slug, (nuevo) => guardar(CLAVES.lugarHabitual, nuevo)];
}

// F3 · Tamaño del grupo (default 4–6, recordado)
export function useGrupo(): [RangoGrupo, (label: string) => void] {
  const guardado = useAlmacen(CLAVES.grupo);
  const rango =
    GRUPO_RANGOS.find((r) => r.label === guardado) ??
    GRUPO_RANGOS.find((r) => r.label === GRUPO_DEFAULT)!;
  return [rango, (label) => guardar(CLAVES.grupo, label)];
}

// F4 · Filtros acumulativos (AND), guardados como "techado,con_sillas"
export function useFiltros(): [Filtro[], (f: Filtro) => void] {
  const guardado = useAlmacen(CLAVES.filtros);
  const activos = useMemo(() => {
    const validos = new Set<string>(FILTROS.map((f) => f.id));
    return (guardado ?? "").split(",").filter((f): f is Filtro => validos.has(f));
  }, [guardado]);

  const alternar = (f: Filtro) => {
    const nuevos = activos.includes(f) ? activos.filter((x) => x !== f) : [...activos, f];
    guardar(CLAVES.filtros, nuevos.join(","));
  };
  return [activos, alternar];
}
