import { getSupabase, SupabaseConfigError } from "./supabase";
import type { Asistencia, Encuentro, EstadoActual, Lugar } from "./tipos";

// Funciona en servidor y cliente. Nunca select('*') en reportes/encuentros/asistencias:
// anon no puede leer device_id.
const COLUMNAS_LUGAR =
  "id, slug, nombre, zona, capacidad_personas, num_mesas, techado, con_sillas, " +
  "microondas_cerca, dist_microondas_m, tiene_mesa, lat, lng, aviso_texto, aviso_hasta, activo";
const COLUMNAS_ENCUENTRO =
  "codigo, lugar_id, hora, personas, nota, creado_en, vence_en, llegada_en, es_demo";
const COLUMNAS_ASISTENCIA = "nombre, creado_en";

// Alfabeto de 003: mayúsculas y dígitos, sin 0/O/1/I.
const CODIGO_VALIDO = /^[A-HJ-NP-Z2-9]{6}$/;

// Código del link → formato de la BD (minúsculas se aceptan). null si no puede ser un código.
export function normalizarCodigo(crudo: string): string | null {
  const codigo = crudo.trim().toUpperCase();
  return CODIGO_VALIDO.test(codigo) ? codigo : null;
}

// excluirCodigo: en la página de un encuentro, ese encuentro no cuenta como "grupo en camino".
export async function cargarEstados(
  incluirDemo: boolean,
  excluirCodigo: string | null = null,
): Promise<EstadoActual[]> {
  const supabase = getSupabase();
  if (incluirDemo) {
    // Idempotente: solo inserta si los datos demo tienen más de 10 min.
    const { error } = await supabase.rpc("seed_demo");
    if (error) console.error("seed_demo:", error);
  }
  const { data, error } = await supabase.rpc("estado_lugares", {
    p_incluir_demo: incluirDemo,
    p_excluir_codigo: excluirCodigo,
  });
  if (error) throw error;
  return (data ?? []) as EstadoActual[];
}

async function cargarLugares(): Promise<Lugar[]> {
  const { data, error } = await getSupabase()
    .from("lugares")
    .select(COLUMNAS_LUGAR)
    .eq("activo", true)
    .order("nombre");
  if (error) throw error;
  return (data ?? []) as unknown as Lugar[];
}

export async function cargarLugarPorSlug(slug: string): Promise<Lugar | null> {
  const { data, error } = await getSupabase()
    .from("lugares")
    .select(COLUMNAS_LUGAR)
    .eq("slug", slug)
    .eq("activo", true)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as Lugar | null;
}

async function cargarEncuentro(codigo: string): Promise<Encuentro | null> {
  const { data, error } = await getSupabase()
    .from("encuentros")
    .select(COLUMNAS_ENCUENTRO)
    .eq("codigo", codigo)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as Encuentro | null;
}

async function cargarAsistencias(codigo: string): Promise<Asistencia[]> {
  const { data, error } = await getSupabase()
    .from("asistencias")
    .select(COLUMNAS_ASISTENCIA)
    .eq("encuentro_codigo", codigo)
    .order("creado_en");
  if (error) throw error;
  return (data ?? []) as unknown as Asistencia[];
}

// Encuentro + su lugar (aunque el lugar ya no esté activo). null si el código no existe.
export async function cargarEncuentroConLugar(
  codigo: string,
): Promise<{ encuentro: Encuentro; lugar: Lugar } | null> {
  const encuentro = await cargarEncuentro(codigo);
  if (!encuentro) return null;
  const { data, error } = await getSupabase()
    .from("lugares")
    .select(COLUMNAS_LUGAR)
    .eq("id", encuentro.lugar_id)
    .maybeSingle();
  if (error) throw error;
  return data ? { encuentro, lugar: data as unknown as Lugar } : null;
}

export type EncuentroEnVivo = {
  encuentro: Encuentro;
  asistencias: Asistencia[];
  estados: EstadoActual[];
};

// Recarga desde el cliente lo que cambia en la página del encuentro.
export async function recargarEncuentro(codigo: string, incluirDemo: boolean): Promise<EncuentroEnVivo> {
  const [encuentro, asistencias, estados] = await Promise.all([
    cargarEncuentro(codigo),
    cargarAsistencias(codigo),
    cargarEstados(incluirDemo, codigo),
  ]);
  if (!encuentro) throw new Error(`El encuentro ${codigo} ya no existe`);
  return { encuentro, asistencias, estados };
}

export type ErrorDatos = { ok: false; mensaje: string; detalle?: string };

export function describirError(e: unknown, mensaje: string): ErrorDatos {
  if (e instanceof SupabaseConfigError) {
    return { ok: false, mensaje: "La app no está configurada.", detalle: e.message };
  }
  console.error(mensaje, e);
  const detalle =
    e && typeof e === "object" && "message" in e
      ? `${"code" in e && e.code ? `${e.code} ` : ""}${String(e.message)}`
      : undefined;
  return { ok: false, mensaje, detalle };
}

export type ResultadoDatos =
  | { ok: true; lugares: Lugar[]; estados: EstadoActual[]; leidoEnMs: number } // leidoEnMs: base para "hace X min"
  | ErrorDatos;

export async function cargarLugaresYEstados(
  incluirDemo: boolean,
  excluirCodigo: string | null = null,
): Promise<ResultadoDatos> {
  try {
    const [lugares, estados] = await Promise.all([
      cargarLugares(),
      cargarEstados(incluirDemo, excluirCodigo),
    ]);
    return { ok: true, lugares, estados, leidoEnMs: Date.now() };
  } catch (e) {
    return describirError(e, "No pudimos cargar los lugares. Revisa tu conexión e intenta de nuevo.");
  }
}

export type ResultadoEncuentro =
  | (EncuentroEnVivo & { ok: true; lugar: Lugar; lugares: Lugar[]; leidoEnMs: number })
  | ErrorDatos;

// Carga inicial de /e/[codigo] (el encuentro y su lugar ya se buscaron para la metadata).
export async function cargarPaginaEncuentro(
  encuentro: Encuentro,
  lugar: Lugar,
  incluirDemo: boolean,
): Promise<ResultadoEncuentro> {
  try {
    const [lugares, estados, asistencias] = await Promise.all([
      cargarLugares(),
      cargarEstados(incluirDemo, encuentro.codigo),
      cargarAsistencias(encuentro.codigo),
    ]);
    return { ok: true, encuentro, lugar, lugares, estados, asistencias, leidoEnMs: Date.now() };
  } catch (e) {
    return describirError(e, "No pudimos cargar el encuentro. Revisa tu conexión e intenta de nuevo.");
  }
}
