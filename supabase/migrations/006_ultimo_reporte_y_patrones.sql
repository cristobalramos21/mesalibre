-- =============================================================================
-- Mesa Libre · 006_ultimo_reporte_y_patrones.sql
-- Cuando un lugar no tiene reportes en los últimos 10 min, la app ya no muestra solo
-- "Sin información reciente": también el último reporte de HOY (con su antigüedad) y
-- cómo suele estar el lugar en este bloque horario (F12, patrones).
--
-- 1. patrones: bloques de 30 min entre 12:00 y 15:30 (antes: solo 13:00, 13:30, 14:00)
--    y valores iniciales ESTIMADOS: no salen de datos observados (solo de la referencia del
--    E1 al peak 13:15–13:50). La app los muestra como «Estimado para esta hora». Pendiente:
--    reemplazarlos con datos de terreno o con los reportes acumulados por día y bloque.
-- 2. estado_lugares agrega ultimo_nivel, ultimo_en y patron_nivel (al final, mismas
--    columnas de antes en el mismo orden). Cambia el tipo de retorno: se recrea junto
--    con la vista estado_actual.
-- 3. seed_demo: College con un reporte demo de hace 40 min (se ve el "último reporte");
--    Pasto sin reportes (solo patrón). Además renueva los reportes demo a los 8 min en
--    vez de 10, para que no queden "Sin información" entre una renovación y otra.
--
-- El frontend anterior sigue funcionando (ignora las columnas nuevas), y el nuevo
-- funciona sin esta migración (las trata como null). Ejecutar después de 005.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. patrones
-- -----------------------------------------------------------------------------

alter table public.patrones drop constraint if exists patrones_bloque_check;
alter table public.patrones
  add constraint patrones_bloque_check check (bloque ~ '^(1[2-5]):(00|30)$');

-- Mismo patrón de lunes a viernes por ahora (el equipo puede afinarlo por día).
-- Bloques:                 12:00    12:30    13:00    13:30    14:00    14:30    15:00    15:30
insert into public.patrones (lugar_id, dia_semana, bloque, nivel_tipico)
select l.id, dia, b.bloque, b.nivel::public.nivel_ocupacion
from (values
  ('el-castano',           array['pocas', 'pocas', 'lleno', 'lleno', 'pocas', 'libre', 'libre', 'libre']),  -- PROVISIONAL
  ('cafeteria-ingenieria', array['libre', 'pocas', 'pocas', 'lleno', 'pocas', 'libre', 'libre', 'libre']),  -- PROVISIONAL
  ('patio-ingenieria',     array['libre', 'libre', 'pocas', 'pocas', 'libre', 'libre', 'libre', 'libre']),  -- PROVISIONAL
  ('patio-virgen',         array['libre', 'pocas', 'lleno', 'lleno', 'pocas', 'libre', 'libre', 'libre']),  -- PROVISIONAL
  ('enfermeria',           array['libre', 'libre', 'pocas', 'pocas', 'libre', 'libre', 'libre', 'libre']),  -- PROVISIONAL
  ('college',              array['libre', 'pocas', 'pocas', 'lleno', 'pocas', 'libre', 'libre', 'libre']),  -- PROVISIONAL
  ('pasto',                array['libre', 'libre', 'pocas', 'pocas', 'libre', 'libre', 'libre', 'libre'])   -- PROVISIONAL
) as p (slug, niveles)
join public.lugares l on l.slug = p.slug
cross join generate_series(1, 5) as dia
cross join lateral unnest(
  array['12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30'], p.niveles
) as b (bloque, nivel)
on conflict (lugar_id, dia_semana, bloque) do update set nivel_tipico = excluded.nivel_tipico;

-- -----------------------------------------------------------------------------
-- 2. estado_lugares (F1 + F20 + último reporte del día + F12)
-- -----------------------------------------------------------------------------

drop view if exists public.estado_actual;
drop function if exists public.estado_lugares(boolean, text);

create function public.estado_lugares(p_incluir_demo boolean default true, p_excluir_codigo text default null)
returns table (
  lugar_id         uuid,
  nivel            public.nivel_ocupacion,
  reportado_en     timestamptz,
  n_reportes_10min int,
  fresco           boolean,
  grupos_en_camino int,
  nivel_efectivo   public.nivel_ocupacion,
  alta_demanda     boolean,
  ultimo_nivel     public.nivel_ocupacion,  -- último reporte de hoy (hora Chile), aunque tenga > 10 min
  ultimo_en        timestamptz,
  patron_nivel     public.nivel_ocupacion   -- nivel típico en este día y bloque; null fuera de 12:00–15:59 o fin de semana
)
language sql
stable
security invoker
set search_path = ''
as $$
  with
  recientes as (            -- ventana de frescura (FRESHNESS_MIN = 10)
    select r.lugar_id, r.nivel, r.creado_en
    from public.reportes r
    where r.creado_en > now() - interval '10 minutes'
      and (p_incluir_demo or not r.es_demo)
  ),
  ultimo as (               -- regla base: gana el más reciente
    select distinct on (r.lugar_id) r.lugar_id, r.nivel, r.creado_en
    from recientes r
    order by r.lugar_id, r.creado_en desc
  ),
  conteo as (               -- ventana de consenso (siempre 10 min)
    select r.lugar_id, r.nivel, count(*) as n, max(r.creado_en) as ultimo_en
    from recientes r
    group by r.lugar_id, r.nivel
  ),
  total_10 as (
    select c.lugar_id, sum(c.n)::int as n
    from conteo c
    group by c.lugar_id
  ),
  moda as (                 -- ≥ 3 reportes que no coinciden: el más repetido; empate → más reciente
    select distinct on (c.lugar_id) c.lugar_id, c.nivel, c.ultimo_en
    from conteo c
    order by c.lugar_id, c.n desc, c.ultimo_en desc
  ),
  ultimo_hoy as (           -- último reporte desde las 00:00 de hoy en Chile
    select distinct on (r.lugar_id) r.lugar_id, r.nivel, r.creado_en
    from public.reportes r
    where r.creado_en >= ((now() at time zone 'America/Santiago')::date::timestamp at time zone 'America/Santiago')
      and (p_incluir_demo or not r.es_demo)
    order by r.lugar_id, r.creado_en desc
  ),
  bloque_actual as (        -- día ISO (1 = lunes) y bloque de 30 min en hora Chile
    select
      extract(isodow from t)::int as dia,
      to_char(t, 'HH24') || case when extract(minute from t) >= 30 then ':30' else ':00' end as bloque
    from (select now() at time zone 'America/Santiago' as t) x
  ),
  estado as (
    select
      l.id as lugar_id,
      case when coalesce(t.n, 0) >= 3 and u.lugar_id is not null then m.nivel     else u.nivel     end as nivel,
      case when coalesce(t.n, 0) >= 3 and u.lugar_id is not null then m.ultimo_en else u.creado_en end as reportado_en,
      coalesce(t.n, 0) as n_reportes_10min,
      u.lugar_id is not null as fresco
    from public.lugares l
    left join ultimo   u on u.lugar_id = l.id
    left join total_10 t on t.lugar_id = l.id
    left join moda     m on m.lugar_id = l.id
    where l.activo
  ),
  en_camino as (            -- F20: encuentro vigente, hora entre now-10 y now+20, sin llegada
    select e.lugar_id, count(*)::int as n
    from public.encuentros e
    where e.vence_en > now()
      and e.llegada_en is null
      and (p_incluir_demo or not e.es_demo)
      and (p_excluir_codigo is null or e.codigo <> upper(trim(p_excluir_codigo)))
      and (((e.creado_en at time zone 'America/Santiago')::date + e.hora) at time zone 'America/Santiago')
          between now() - interval '10 minutes' and now() + interval '20 minutes'
    group by e.lugar_id
  )
  select
    s.lugar_id,
    s.nivel,
    s.reportado_en,
    s.n_reportes_10min,
    s.fresco,
    coalesce(c.n, 0) as grupos_en_camino,
    case
      when s.nivel = 'libre' and coalesce(c.n, 0) >= 3 then 'pocas'::public.nivel_ocupacion  -- DEMAND_LIBRE
      when s.nivel = 'pocas' and coalesce(c.n, 0) >= 2 then 'lleno'::public.nivel_ocupacion  -- DEMAND_FULL
      else s.nivel
    end as nivel_efectivo,
    case
      when s.nivel = 'libre' then coalesce(c.n, 0) >= 3   -- DEMAND_LIBRE
      when s.nivel = 'pocas' then coalesce(c.n, 0) >= 1   -- DEMAND_WARN
      else false
    end as alta_demanda,
    h.nivel     as ultimo_nivel,
    h.creado_en as ultimo_en,
    p.nivel_tipico as patron_nivel
  from estado s
  left join en_camino  c on c.lugar_id = s.lugar_id
  left join ultimo_hoy h on h.lugar_id = s.lugar_id
  cross join bloque_actual b
  left join public.patrones p
    on p.lugar_id = s.lugar_id and p.dia_semana = b.dia and p.bloque = b.bloque;
$$;

create view public.estado_actual
with (security_invoker = true) as
select * from public.estado_lugares(true, null);

revoke all on table public.estado_actual from public, anon, authenticated;
grant select on table public.estado_actual to anon;

revoke execute on function public.estado_lugares(boolean, text) from public, anon, authenticated;
grant execute on function public.estado_lugares(boolean, text) to anon;

-- -----------------------------------------------------------------------------
-- 3. seed_demo (igual que 004, salvo lo indicado arriba)
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

  -- 8 min (< FRESHNESS_MIN = 10): se renuevan antes de vencer.
  v_reportes := not exists (
    select 1 from public.reportes
    where es_demo and creado_en > now() - interval '8 minutes'
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

    -- College: sin información reciente, pero con un último reporte de hace 40 min.
    -- Solo si hoy (hora Chile) ya pasaron 40 min: si no, quedaría con fecha de ayer.
    if v_ahora_cl::time >= time '00:40' then
      insert into public.reportes (lugar_id, nivel, device_id, es_demo, creado_en)
      select l.id, 'pocas', '00000000-0000-4000-8000-00000000de01'::uuid, true, now() - interval '40 minutes'
      from public.lugares l
      where l.slug = 'college' and l.activo;
    end if;
  end if;

  if v_encuentros then
    -- Borra los demo anteriores (y sus asistencias, por cascada) para no acumular filas.
    delete from public.encuentros where es_demo;

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

commit;
