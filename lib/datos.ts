import { getSupabase, SupabaseConfigError } from "./supabase";
import type { EstadoActual, Lugar } from "./tipos";

// Funciona en servidor y cliente. Nunca select('*') en reportes/encuentros/asistencias:
// anon no puede leer device_id.
const COLUMNAS_LUGAR =
  "id, slug, nombre, zona, capacidad_personas, num_mesas, techado, con_sillas, " +
  "microondas_cerca, dist_microondas_m, tiene_mesa, lat, lng, aviso_texto, aviso_hasta, activo";

export async function cargarEstados(incluirDemo: boolean): Promise<EstadoActual[]> {
  const supabase = getSupabase();
  if (incluirDemo) {
    // Idempotente: solo inserta si los datos demo tienen más de 10 min.
    const { error } = await supabase.rpc("seed_demo");
    if (error) console.error("seed_demo:", error);
  }
  const { data, error } = await supabase.rpc("estado_lugares", {
    p_incluir_demo: incluirDemo,
    p_excluir_codigo: null,
  });
  if (error) throw error;
  return (data ?? []) as EstadoActual[];
}

export type ResultadoDatos =
  | { ok: true; lugares: Lugar[]; estados: EstadoActual[]; leidoEnMs: number } // leidoEnMs: base para "hace X min"
  | { ok: false; mensaje: string; detalle?: string };

export async function cargarLugaresYEstados(incluirDemo: boolean): Promise<ResultadoDatos> {
  try {
    const supabase = getSupabase();
    const [lugares, estados] = await Promise.all([
      supabase.from("lugares").select(COLUMNAS_LUGAR).eq("activo", true).order("nombre"),
      cargarEstados(incluirDemo),
    ]);
    if (lugares.error) throw lugares.error;
    return {
      ok: true,
      lugares: (lugares.data ?? []) as unknown as Lugar[],
      estados,
      leidoEnMs: Date.now(),
    };
  } catch (e) {
    if (e instanceof SupabaseConfigError) {
      return { ok: false, mensaje: "La app no está configurada.", detalle: e.message };
    }
    console.error("Error cargando lugares:", e);
    const detalle =
      e && typeof e === "object" && "message" in e
        ? `${"code" in e && e.code ? `${e.code} ` : ""}${String(e.message)}`
        : undefined;
    return {
      ok: false,
      mensaje: "No pudimos cargar los lugares. Revisa tu conexión e intenta de nuevo.",
      detalle,
    };
  }
}
