-- =============================================================================
-- Mesa Libre · 007_fotos_reportes.sql
-- Foto opcional al reportar (Rec. 3 del informe E3).
--
-- Resguardos:
--  · Bucket público "fotos-reportes": solo JPEG, máximo 1 MB. El cliente comprime y
--    re-codifica la imagen (se pierden los metadatos EXIF, incluido el GPS).
--  · anon solo puede SUBIR (insert) con nombre <uuid v4>.jpg: no puede listar, sobrescribir
--    ni borrar. Las fotos se ven por su URL pública, que solo se conoce desde la app.
--  · La app muestra una foto solo durante 30 min (FOTO_VIGENCIA_MIN en lib/config.ts) y solo
--    si nadie la ocultó: "Ocultar foto" la saca para todos de inmediato.
--  · Los archivos se borran a las 24 h con la GitHub Action limpiar-fotos.yml (usa la clave
--    service_role como secret del repo). Borrar filas de storage.objects por SQL NO borra el
--    archivo, por eso se hace por la API de Storage.
--
-- insert_reporte gana p_foto_path (default null): las llamadas de 3 parámetros, incluida la
-- de marcar_llegada, siguen funcionando. Ejecutar después de 006.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- Storage
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos-reportes', 'fotos-reportes', true, 1048576, array['image/jpeg'])
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "anon sube fotos de reportes" on storage.objects;
create policy "anon sube fotos de reportes" on storage.objects
  for insert to anon
  with check (
    bucket_id = 'fotos-reportes'
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.jpg$'
  );

-- -----------------------------------------------------------------------------
-- Tablas
-- -----------------------------------------------------------------------------

alter table public.reportes
  add column if not exists foto_path text
  check (foto_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.jpg$');

-- Una foto pertenece a un solo reporte.
create unique index if not exists reportes_foto_path_idx
  on public.reportes (foto_path) where foto_path is not null;
create index if not exists reportes_lugar_foto_idx
  on public.reportes (lugar_id, creado_en desc) where foto_path is not null;

-- Fotos que alguien ocultó ("Ocultar foto"). Sin acceso directo de anon.
create table if not exists public.fotos_ocultas (
  foto_path text primary key,
  creado_en timestamptz not null default now()
);
alter table public.fotos_ocultas enable row level security;
revoke all on table public.fotos_ocultas from public, anon, authenticated;

-- foto_path no se expone por columna: la foto vigente se lee con foto_reciente().

-- -----------------------------------------------------------------------------
-- insert_reporte con foto opcional
-- -----------------------------------------------------------------------------

drop function if exists public.insert_reporte(uuid, public.nivel_ocupacion, uuid);

create function public.insert_reporte(
  p_lugar_id uuid, p_nivel public.nivel_ocupacion, p_device_id uuid, p_foto_path text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_lugar_id is null or p_nivel is null or p_device_id is null then
    raise exception 'Faltan datos para el reporte' using errcode = '22004';
  end if;

  if not exists (select 1 from public.lugares where id = p_lugar_id and activo) then
    raise exception 'El lugar no existe' using errcode = 'P0002';
  end if;

  -- La foto debe estar recién subida al bucket y no usada en otro reporte.
  if p_foto_path is not null and (
    not exists (
      select 1 from storage.objects
      where bucket_id = 'fotos-reportes'
        and name = p_foto_path
        and created_at > now() - interval '15 minutes'
    )
    or exists (select 1 from public.reportes where foto_path = p_foto_path)
  ) then
    raise exception 'La foto no es válida' using errcode = '22023', hint = 'foto_invalida';
  end if;

  -- Serializa reportes simultáneos del mismo device y lugar para que el cooldown no se salte.
  perform pg_advisory_xact_lock(hashtextextended('reporte:' || p_device_id || ':' || p_lugar_id, 0));

  if exists (
    select 1 from public.reportes
    where device_id = p_device_id
      and lugar_id = p_lugar_id
      and creado_en > now() - interval '5 minutes'   -- REPORT_COOLDOWN_MIN
  ) then
    return 'cooldown';
  end if;

  insert into public.reportes (lugar_id, nivel, device_id, foto_path)
  values (p_lugar_id, p_nivel, p_device_id, p_foto_path);

  return 'ok';
end;
$$;

-- -----------------------------------------------------------------------------
-- Foto vigente de un lugar (≤ 30 min, FOTO_VIGENCIA_MIN) y ocultar una foto
-- -----------------------------------------------------------------------------

create or replace function public.foto_reciente(p_lugar_id uuid)
returns table (foto_path text, nivel public.nivel_ocupacion, creado_en timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select r.foto_path, r.nivel, r.creado_en
  from public.reportes r
  where r.lugar_id = p_lugar_id
    and r.foto_path is not null
    and r.creado_en > now() - interval '30 minutes'
    and not exists (select 1 from public.fotos_ocultas o where o.foto_path = r.foto_path)
  order by r.creado_en desc
  limit 1;
$$;

create or replace function public.ocultar_foto(p_foto_path text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.fotos_ocultas (foto_path)
  select r.foto_path from public.reportes r where r.foto_path = p_foto_path
  on conflict do nothing;
$$;

-- -----------------------------------------------------------------------------
-- Permisos
-- -----------------------------------------------------------------------------

revoke execute on function
  public.insert_reporte(uuid, public.nivel_ocupacion, uuid, text),
  public.foto_reciente(uuid),
  public.ocultar_foto(text)
from public, anon, authenticated;

grant execute on function
  public.insert_reporte(uuid, public.nivel_ocupacion, uuid, text),
  public.foto_reciente(uuid),
  public.ocultar_foto(text)
to anon;

commit;
