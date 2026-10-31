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

// --- Decisiones de implementación (no están en §4 de CLAUDE.md) ---
export const LUGARES_COMUNES = ['el-castano', 'cafeteria-ingenieria', 'patio-ingenieria', 'patio-virgen', 'college']; // [DECIDIR] F2: 5 lugares comunes
export const ALTERNATIVAS_SIN_MESA = false; // [DECIDIR] F6: si Pasto (tiene_mesa=false) puede aparecer como alternativa
export const DEMO_COOKIE = 'ml_demo';       // 'off' = sin datos demo (se fija con ?demo=off, se borra con ?demo=on)
export const ATAJOS_HORA = ['13:30', '13:45']; // F7: atajos fijos además de "Ahora"
export const NOTA_MAX = 80;                 // F7 (también en BD: check en encuentros.nota)
export const NOMBRE_MAX = 30;               // F9 (también en BD: check en asistencias.nombre)
