// Tipos de las tablas y la vista de Supabase (supabase/migrations/001_schema.sql).

export type NivelOcupacion = "libre" | "pocas" | "lleno";

export type Lugar = {
  id: string;
  slug: string;
  nombre: string;
  zona: string | null;
  capacidad_personas: number;
  num_mesas: number | null;
  techado: boolean;
  con_sillas: boolean;
  microondas_cerca: boolean;
  dist_microondas_m: number | null;
  tiene_mesa: boolean;
  lat: number;
  lng: number;
  aviso_texto: string | null;
  aviso_hasta: string | null;
  activo: boolean;
};

export type EstadoActual = {
  lugar_id: string;
  nivel: NivelOcupacion | null;
  reportado_en: string | null;
  n_reportes_10min: number;
  fresco: boolean;
  grupos_en_camino: number;
  nivel_efectivo: NivelOcupacion | null;
  alta_demanda: boolean;
};
