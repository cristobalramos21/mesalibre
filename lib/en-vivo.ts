import { useCallback, useEffect, useState } from "react";
import { POLL_MS, RELATIVE_TIME_TICK_MS } from "./config";
import { cargarEstados } from "./datos";
import { getSupabase } from "./supabase";
import type { EstadoActual } from "./tipos";

// Estados en vivo: Realtime sobre reportes/encuentros + polling cada 60 s (además vence
// estados por tiempo aunque no haya cambios) + al volver a la pestaña.
export function useEstadosEnVivo(iniciales: EstadoActual[], incluirDemo: boolean) {
  const [estados, setEstados] = useState(iniciales);

  const refrescar = useCallback(async () => {
    try {
      setEstados(await cargarEstados(incluirDemo));
    } catch (e) {
      console.error("No se pudo actualizar el estado:", e);
    }
  }, [incluirDemo]);

  useEffect(() => {
    const supabase = getSupabase();
    let espera: ReturnType<typeof setTimeout> | undefined;
    // Agrupa ráfagas de eventos en una sola consulta.
    const programar = () => {
      clearTimeout(espera);
      espera = setTimeout(refrescar, 400);
    };

    const canal = supabase
      .channel(`estado-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "reportes" }, programar)
      .on("postgres_changes", { event: "*", schema: "public", table: "encuentros" }, programar)
      .subscribe();

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
      supabase.removeChannel(canal);
    };
  }, [refrescar]);

  return { estados, refrescar };
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
