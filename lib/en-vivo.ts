import { useCallback, useEffect, useRef, useState } from "react";
import { POLL_MS, RELATIVE_TIME_TICK_MS } from "./config";
import { cargarEstados } from "./datos";
import { getSupabase } from "./supabase";
import type { EstadoActual } from "./tipos";

export type TablaEnVivo = { table: "reportes" | "encuentros" | "asistencias"; filter?: string };

const TABLAS_ESTADO: TablaEnVivo[] = [{ table: "reportes" }, { table: "encuentros" }];

// Datos en vivo: Realtime sobre las tablas indicadas + polling cada 60 s (además vence
// estados por tiempo aunque no haya cambios) + al volver a la pestaña.
export function useDatosEnVivo<T>(inicial: T, cargar: () => Promise<T>, tablas: TablaEnVivo[]) {
  const [datos, setDatos] = useState(inicial);
  const cargarActual = useRef(cargar);
  useEffect(() => {
    cargarActual.current = cargar;
  });

  const refrescar = useCallback(async () => {
    try {
      setDatos(await cargarActual.current());
    } catch (e) {
      console.error("No se pudo actualizar:", e);
    }
  }, []);

  // Clave estable para no resuscribir en cada render si el arreglo se crea de nuevo.
  const claveTablas = JSON.stringify(tablas);

  useEffect(() => {
    const supabase = getSupabase();
    let espera: ReturnType<typeof setTimeout> | undefined;
    // Agrupa ráfagas de eventos en una sola consulta.
    const programar = () => {
      clearTimeout(espera);
      espera = setTimeout(refrescar, 400);
    };

    // Un canal por tabla: si una tabla no está publicada en Realtime, el servidor rechaza el
    // canal completo; así las demás siguen llegando.
    const sufijo = Math.random().toString(36).slice(2);
    const canales = (JSON.parse(claveTablas) as TablaEnVivo[]).map(({ table, filter }) =>
      supabase
        .channel(`en-vivo-${table}-${sufijo}`)
        .on("postgres_changes", { event: "*", schema: "public", table, ...(filter ? { filter } : {}) }, programar)
        .subscribe(),
    );

    const intervalo = setInterval(refrescar, POLL_MS);
    const alVolver = () => {
      if (document.visibilityState === "visible") programar();
    };
    document.addEventListener("visibilitychange", alVolver);
    // Al montar: los datos iniciales pueden venir de la caché del navegador (botón atrás).
    programar();

    return () => {
      clearTimeout(espera);
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", alVolver);
      for (const canal of canales) supabase.removeChannel(canal);
    };
  }, [claveTablas, refrescar]);

  return { datos, refrescar };
}

export function useEstadosEnVivo(iniciales: EstadoActual[], incluirDemo: boolean) {
  const cargar = useCallback(() => cargarEstados(incluirDemo), [incluirDemo]);
  const { datos, refrescar } = useDatosEnVivo(iniciales, cargar, TABLAS_ESTADO);
  return { estados: datos, refrescar };
}

// Hora de referencia para "hace X min", recalculada cada 30 s.
export function useAhora(inicialMs: number): number {
  const [ahora, setAhora] = useState(inicialMs);
  useEffect(() => {
    const tick = () => setAhora(Date.now());
    const primero = setTimeout(tick, 0);
    const intervalo = setInterval(tick, RELATIVE_TIME_TICK_MS);
    return () => {
      clearTimeout(primero);
      clearInterval(intervalo);
    };
  }, []);
  return ahora;
}
