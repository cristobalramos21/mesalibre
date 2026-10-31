-- =============================================================================
-- Mesa Libre · 003_estado_lugares_demo.sql
-- 1. Código de encuentro: solo mayúsculas y dígitos (sin 0/O/1/I); se normaliza a mayúsculas.
-- 2. estado_lugares(incluir_demo, excluir_codigo): única fuente de la lógica F1 + F20.
--    La vista estado_actual queda como base interna (= estado_lugares(true, null)).
-- 3. seed_demo(): escenario fijo de datos de demostración (CLAUDE.md §10).
-- Ejecutar después de 001 y 002.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Código de encuentro
-- -----------------------------------------------------------------------------

-- not valid: valida solo filas nuevas; no toca encuentros creados con el alfabeto anterior.
alter table public.encuentros drop constraint encuentros_codigo_check;
alter table public.encuentros
  add constraint encuentros_codigo_check check (codigo ~ '^[A-HJ-NP-Z2-9]{6}$') not valid;

create or replace function public.generar_codigo_encuentro()
returns text
language sql
volatile
set search_path = ''
as $$
  select string_agg(
           substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1),
           '')
  from generate_series(1, 6);
$$;

create or replace function public.marcar_llegada(p_codigo text, p_device_id uuid, p_sin_mesa boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_codigo   text := upper(trim(p_codigo));
  v_lugar_id uuid;
begin
  if p_device_id is null then
    raise exception 'Falta device_id' using errcode = '22004';
  end if;

  select lugar_id into v_lugar_id
  from public.encuentros
  where codigo = v_codigo and vence_en > now();

  if v_lugar_id is null then
    raise exception 'El encuentro no existe o ya terminó' using errcode = 'P0002';
  end if;

  update public.encuentros
  set llegada_en = coalesce(llegada_en, now())
  where codigo = v_codigo;

  if coalesce(p_sin_mesa, false) then
    return public.insert_reporte(v_lugar_id, 'lleno', p_device_id);
  end if;

  return 'ok';
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. estado_lugares (F1 + F20), security invoker: respeta RLS de quien consulta.
--    p_incluir_demo = false ignora reportes y encuentros es_demo (?demo=off).
--    p_excluir_codigo: no cuenta ese encuentro como "grupo en camino" (página del encuentro).
-- -----------------------------------------------------------------------------

create function public.estado_lugares(p_incluir_demo boolean default true, p_excluir_codigo text default null)
returns table (
  lugar_id         uuid,
  nivel            public.nivel_ocupacion,
  reportado_en     timestamptz,
  n_reportes_10min int,
  fresco           boolean,
  grupos_en_camino int,
  nivel_efectivo   public.nivel_ocupacion,
  alta_demanda     boolean
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
    from public.reportes r
    where r.creado_en > now() - interval '10 minutes'
      and (p_incluir_demo or not r.es_demo)
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
    end as alta_demanda
  from estado s
  left join en_camino c on c.lugar_id = s.lugar_id;
$$;

drop view public.estado_actual;
create view public.estado_actual
with (security_invoker = true) as
select * from public.estado_lugares(true, null);

-- -----------------------------------------------------------------------------
-- 3. seed_demo: si el último reporte demo tiene más de 10 min, inserta el escenario
--    fijo con hora actual. Idempotente y con lock: se puede llamar en cada carga.
--    3 reportes por lugar para que, por la regla de consenso (F1), un reporte real
--    aislado durante una prueba no rompa el escenario.
--    Escenario: El Castaño lleno; Cafetería de Ingeniería y Enfermería libres y
--    Patio de Ingeniería con pocas (todas a < 5 min); Patio de la Virgen lleno;
--    College y Pasto sin información reciente.
-- -----------------------------------------------------------------------------

create function public.seed_demo()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('seed_demo', 0));

  if exists (
    select 1 from public.reportes
    where es_demo and creado_en > now() - interval '10 minutes'
  ) then
    return false;
  end if;

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

  return true;
end;
$$;

-- -----------------------------------------------------------------------------
-- Permisos
-- -----------------------------------------------------------------------------

revoke all on table public.estado_actual from public, anon, authenticated;
grant select on table public.estado_actual to anon;

revoke execute on function
  public.estado_lugares(boolean, text),
  public.seed_demo(),
  public.generar_codigo_encuentro(),
  public.marcar_llegada(text, uuid, boolean)
from public, anon, authenticated;

grant execute on function
  public.estado_lugares(boolean, text),
  public.seed_demo(),
  public.marcar_llegada(text, uuid, boolean)
to anon;

commit;
