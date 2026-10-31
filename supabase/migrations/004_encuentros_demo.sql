-- =============================================================================
-- Mesa Libre · 004_encuentros_demo.sql
-- 1. seed_demo(): además de los reportes, mantiene 2 encuentros demo hacia el Patio de
--    Ingeniería (reportado "pocas"), para que se vea F20: con 2 grupos en camino pasa a
--    "Alta demanda" y deja de ofrecerse como alternativa (O6).
-- 2. Realtime en asistencias (lista de "quiénes van" en vivo).
-- Ejecutar después de 003. No agrega GRANTs: seed_demo ya es ejecutable por anon y
-- create or replace conserva los permisos.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. seed_demo
--    Reportes: igual que en 003 (se renuevan si el último reporte demo tiene > 10 min).
--    Encuentros: un encuentro cuenta como "en camino" mientras su hora esté entre
--    now-10 y now+20 min. Se crean con hora = ahora + 10 min, así cuentan durante los
--    próximos 20 min. Se recrean cuando quedan menos de 2 que sigan contando al menos
--    10 min más (hora >= now), o sea, a lo más cada 10 min, igual que los reportes.
--    No se crean desde las 23:40 (hora Chile): el encuentro vence a las 23:59 y la hora
--    pasaría de medianoche. Así cada encuentro recién creado cumple la condición y la
--    función nunca se vuelve a disparar por sus propios cambios (Realtime → recarga).
-- -----------------------------------------------------------------------------

create or replace function public.seed_demo()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ahora_cl timestamp := now() at time zone 'America/Santiago';
  v_patio    uuid;
  v_reportes boolean;
  v_encuentros boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended('seed_demo', 0));

  v_reportes := not exists (
    select 1 from public.reportes
    where es_demo and creado_en > now() - interval '10 minutes'
  );

  select id into v_patio from public.lugares where slug = 'patio-ingenieria' and activo;

  v_encuentros := v_patio is not null
    and v_ahora_cl::time < time '23:40'
    and (
      select count(*) from public.encuentros e
      where e.es_demo
        and e.lugar_id = v_patio
        and e.llegada_en is null
        and e.vence_en > now()
        and (((e.creado_en at time zone 'America/Santiago')::date + e.hora) at time zone 'America/Santiago')
            between now() and now() + interval '20 minutes'
    ) < 2;

  if not v_reportes and not v_encuentros then
    return false;
  end if;

  if v_reportes then
    insert into public.reportes (lugar_id, nivel, device_id, es_demo)
    select l.id, d.nivel::public.nivel_ocupacion, dev.id, true
    from (values
            ('el-castano',           'lleno'),
            ('cafeteria-ingenieria', 'libre'),
            ('enfermeria',           'libre'),
            ('patio-ingenieria',     'pocas'),
            ('patio-virgen',         'lleno')
         ) as d (slug, nivel)
    join public.lugares l on l.slug = d.slug and l.activo
    cross join (values
            ('00000000-0000-4000-8000-00000000de01'::uuid),
            ('00000000-0000-4000-8000-00000000de02'::uuid),
            ('00000000-0000-4000-8000-00000000de03'::uuid)
         ) as dev (id);
  end if;

  if v_encuentros then
    -- Borra los demo anteriores (y sus asistencias, por cascada) para no acumular filas.
    delete from public.encuentros where es_demo;

    -- El trigger encuentros_antes_insertar fija código, creado_en y vence_en; con
    -- es_demo = true no aplica el límite de 3 por hora.
    insert into public.encuentros (lugar_id, hora, personas, nota, device_id, es_demo)
    select v_patio,
           (date_trunc('minute', v_ahora_cl) + interval '10 minutes')::time,
           d.personas, null, d.device_id, true
    from (values
            (5, '00000000-0000-4000-8000-00000000de01'::uuid),
            (4, '00000000-0000-4000-8000-00000000de02'::uuid)
         ) as d (personas, device_id);
  end if;

  return true;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. Realtime en asistencias. Realtime solo entrega columnas que anon puede leer
--    (sin device_id, ver permisos por columna en 001).
-- -----------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'asistencias') then
    alter publication supabase_realtime add table public.asistencias;
  end if;
end;
$$;

commit;
