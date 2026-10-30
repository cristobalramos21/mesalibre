import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export class SupabaseConfigError extends Error {
  name = "SupabaseConfigError";
}

let cliente: SupabaseClient | null = null;

// Cliente con la clave pública (anon / sb_publishable_...). No hay auth: no se guarda sesión.
// Se crea al primer uso para que importar este módulo nunca rompa el build.
export function getSupabase(): SupabaseClient {
  if (cliente) return cliente;

  // Referencias literales: Next solo inyecta NEXT_PUBLIC_* si se escriben así.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const faltantes = [
    !url && "NEXT_PUBLIC_SUPABASE_URL",
    !key && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ].filter(Boolean);
  if (faltantes.length > 0) {
    throw new SupabaseConfigError(
      `Falta la variable de entorno ${faltantes.join(" y ")}. ` +
        "Agrégala en .env.local (ver .env.example) o en Vercel.",
    );
  }

  cliente = createClient(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cliente;
}
