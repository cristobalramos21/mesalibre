import { useSyncExternalStore } from "react";

// localStorage siempre dentro de try/catch. Si no está disponible (modo privado
// estricto, bloqueado), se usa memoria: la app funciona igual durante la visita.
const memoria = new Map<string, string>();
const EVENTO = "ml-almacen";

export const CLAVES = {
  lugarHabitual: "ml_lugar_habitual",
  grupo: "ml_grupo",
  filtros: "ml_filtros",
  deviceId: "ml_device_id",
} as const;

export function leer(clave: string): string | null {
  try {
    return window.localStorage.getItem(clave);
  } catch {
    return memoria.get(clave) ?? null;
  }
}

export function guardar(clave: string, valor: string | null): void {
  try {
    if (valor === null) window.localStorage.removeItem(clave);
    else window.localStorage.setItem(clave, valor);
  } catch {
    if (valor === null) memoria.delete(clave);
    else memoria.set(clave, valor);
  }
  window.dispatchEvent(new Event(EVENTO));
}

function suscribir(avisar: () => void) {
  window.addEventListener("storage", avisar);
  window.addEventListener(EVENTO, avisar);
  return () => {
    window.removeEventListener("storage", avisar);
    window.removeEventListener(EVENTO, avisar);
  };
}

// Valor guardado (null en el servidor y durante la hidratación).
export function useAlmacen(clave: string): string | null {
  return useSyncExternalStore(
    suscribir,
    () => leer(clave),
    () => null,
  );
}

const sinSuscripcion = () => () => {};

// false en el servidor y durante la hidratación; true después.
export function useHidratado(): boolean {
  return useSyncExternalStore(
    sinSuscripcion,
    () => true,
    () => false,
  );
}
