// Constantes centrales del MVP (CLAUDE.md §4). Cambiar valores solo aquí.
// Ojo: FRESHNESS_MIN, REPORT_COOLDOWN_MIN, DEMAND_* y MAX_ENCUENTROS_HORA también están
// escritos en supabase/migrations/001_schema.sql; si cambian, actualizar ambos lugares.

export const FRESHNESS_MIN = 10;        // [DECIDIR] 10 o 20 (el borrador E2 dice ambos)
export const REPORT_COOLDOWN_MIN = 5;   // 1 reporte por device y lugar cada 5 min (en BD)
export const DEMAND_BEFORE_MIN = 10;    // ventana "grupo en camino"
export const DEMAND_AFTER_MIN = 20;
export const DEMAND_WARN = 1;           // [DECIDIR] pocas + 1 grupo → "pocas · alta demanda"
export const DEMAND_FULL = 2;           // [DECIDIR] pocas + ≥2 → tratado como lleno
export const DEMAND_LIBRE = 3;          // [DECIDIR] libre + ≥3 → "pocas · alta demanda"
export const MAX_ENCUENTROS_HORA = 3;   // por device
export const WALK_M_PER_MIN = 80;
export const N_ALTERNATIVAS = 3;
export const GRUPO_RANGOS = [ {label:'1',min:1}, {label:'2–3',min:2}, {label:'4–6',min:4}, {label:'7+',min:7} ];
export const GRUPO_DEFAULT = '4–6';
export const POLL_MS = 60_000;          // respaldo si falla Realtime
export const RELATIVE_TIME_TICK_MS = 30_000;
