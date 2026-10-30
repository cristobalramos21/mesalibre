-- =============================================================================
-- Mesa Libre · 001_schema.sql
-- Esquema, vista estado_actual, funciones, RLS y permisos (CLAUDE.md §5 y §6).
-- Ejecutar UNA vez en el SQL editor de Supabase, antes de 002_seed.sql.
--
-- Constantes duplicadas desde lib/config.ts (mantener sincronizadas):
--   FRESHNESS_MIN = 10 · REPORT_COOLDOWN_MIN = 5 · DEMAND_BEFORE_MIN = 10
--   DEMAND_AFTER_MIN = 20 · DEMAND_WARN = 1 · DEMAND_FULL = 2 · DEMAND_LIBRE = 3
--   MAX_ENCUENTROS_HORA = 3
-- Zona horaria de horas y vencimientos: America/Santiago.
--
-- Columnas device_id: anon NO puede leerlas (permisos por columna). Desde el
-- cliente hay que listar columnas explícitas; select('*') sobre reportes,
-- encuentros o asistencias falla con "permission denied".
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- Tipos y tablas
-- -----------------------------------------------------------------------------

create type public.nivel_ocupacion as enum ('libre', 'pocas', 'lleno');

create table public.lugares (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique check (slug ~ '^[a-z0-9-]+$'),
  nombre             text not null,
  zona               text,
  capacidad_personas int  not null check (capacidad_personas > 0),
  num_mesas          int  check (num_mesas >= 0),
  techado            bool not null default false,
  con_sillas         bool not null default false,
  microondas_cerca   bool not null default false,
  dist_microondas_m  int  check (dist_microondas_m >= 0),
  tiene_mesa         bool not null default true,
  lat                float8 not null check (lat between -90 and 90),
  lng                float8 not null check (lng between -180 and 180),
  aviso_texto        text check (char_length(aviso_texto) <= 140),
  aviso_hasta        timestamptz,
  activo             bool not null default true
);

create table public.reportes (
  id         bigint generated always as identity primary key,
  lugar_id   uuid not null references public.lugares (id) on delete cascade,
  nivel      public.nivel_ocupacion not null,
  device_id  uuid not null,
  es_demo    bool not null default false,
  creado_en  timestamptz not null default now()
);

create index reportes_lugar_creado_idx  on public.reportes (lugar_id, creado_en desc);
create index reportes_creado_idx        on public.reportes (creado_en desc);
create index reportes_cooldown_idx      on public.reportes (device_id, lugar_id, creado_en desc);

create table public.patrones (
  lugar_id      uuid not null references public.lugares (id) on delete cascade,
  dia_semana    int  not null check (dia_semana between 1 and 5),
  bloque        text not null check (bloque in ('13:00', '13:30', '14:00')),
  nivel_tipico  public.nivel_ocupacion not null,
  primary key (lugar_id, dia_semana, bloque)
);

create table public.encuentros (
  -- 6 caracteres, alfabeto sin 0/O/1/l/I. Lo genera el trigger, no el cliente.
  codigo      text primary key check (codigo ~ '^[A-HJ-NP-Za-km-z2-9]{6}$'),
  lugar_id    uuid not null references public.lugares (id) on delete cascade,
  hora        time not null,
  personas    int  not null check (personas between 1 and 50),
  nota        text check (char_length(nota) <= 80),
  creado_en   timestamptz not null default now(),
  vence_en    timestamptz not null,  -- 23:59 hora Chile del día de creación (trigger)
  device_id   uuid not null,
  llegada_en  timestamptz,
  es_demo     bool not null default false
);

create index encuentros_lugar_vence_idx   on public.encuentros (lugar_id, vence_en);
create index encuentros_device_creado_idx on public.encuentros (device_id, creado_en desc);

create table public.asistencias (
  encuentro_codigo text not null references public.encuentros (codigo) on delete cascade,
  device_id        uuid not null,
  nombre           text check (char_length(nombre) <= 30),
  creado_en        timestamptz not null default now(),
  primary key (encuentro_codigo, device_id)
);

-- -----------------------------------------------------------------------------
-- Vista estado_actual (F1 + F20). Una fila por lugar activo.
-- security_invoker: respeta RLS y permisos de quien consulta (anon).
-- Por ahora incluye reportes y encuentros demo (es_demo); el filtro para ?demo=off
-- y la exclusión del propio encuentro (excluir_codigo) quedan pendientes.
-- -----------------------------------------------------------------------------

create view public.estado_actual
with (security_invoker = true) as
with
recientes as (            -- ventana de frescura (FRESHNESS_MIN = 10)
  select r.lugar_id, r.nivel, r.creado_en
  from public.reportes r
  where r.creado_en > now() - interval '10 minutes'
),
ultimo as (               -- regla base: gana el más reciente
  select distinct on (lugar_id) lugar_id, nivel, creado_en
  from recientes
  order by lugar_id, creado_en desc
),
ultimos_10 as (           -- ventana de consenso (siempre 10 min)
  select r.lugar_id, r.nivel, r.creado_en
  from public.reportes r
  where r.creado_en > now() - interval '10 minutes'
),
conteo as (
  select lugar_id, nivel, count(*) as n, max(creado_en) as ultimo_en
  from ultimos_10
  group by lugar_id, nivel
),
total_10 as (
  select lugar_id, sum(n)::int as n
  from conteo
  group by lugar_id
),
moda as (                 -- ≥ 3 reportes que no coinciden: el más repetido; empate → más reciente
  select distinct on (lugar_id) lugar_id, nivel, ultimo_en
  from conteo
  order by lugar_id, n desc, ultimo_en desc
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

-- -----------------------------------------------------------------------------
-- Funciones (security definer, search_path vacío y nombres calificados)
-- -----------------------------------------------------------------------------

-- Único camino para insertar reportes. Devuelve 'ok' o 'cooldown'.
create function public.insert_reporte(p_lugar_id uuid, p_nivel public.nivel_ocupacion, p_device_id uuid)
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

  insert into public.reportes (lugar_id, nivel, device_id)
  values (p_lugar_id, p_nivel, p_device_id);

  return 'ok';
end;
$$;

-- Marca la llegada del grupo. Si sin_mesa, además reporta 'lleno' (mismo cooldown).
-- Devuelve 'ok', o el resultado de insert_reporte ('ok' | 'cooldown') si sin_mesa.
create function public.marcar_llegada(p_codigo text, p_device_id uuid, p_sin_mesa boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lugar_id uuid;
begin
  if p_device_id is null then
    raise exception 'Falta device_id' using errcode = '22004';
  end if;

  select lugar_id into v_lugar_id
  from public.encuentros
  where codigo = p_codigo and vence_en > now();

  if v_lugar_id is null then
    raise exception 'El encuentro no existe o ya terminó' using errcode = 'P0002';
  end if;

  update public.encuentros
  set llegada_en = coalesce(llegada_en, now())
  where codigo = p_codigo;

  if coalesce(p_sin_mesa, false) then
    return public.insert_reporte(v_lugar_id, 'lleno', p_device_id);
  end if;

  return 'ok';
end;
$$;

-- Código de 6 caracteres, alfabeto sin 0/O/1/l/I. Uso interno (no expuesto a anon).
create function public.generar_codigo_encuentro()
returns text
language sql
volatile
set search_path = ''
as $$
  select string_agg(
           substr('ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789',
                  1 + floor(random() * 57)::int, 1),
           '')
  from generate_series(1, 6);
$$;

-- Trigger de encuentros: aplica las reglas tanto al INSERT directo como a crear_encuentro.
-- Fija código, fechas y llegada; limita a 3 por device por hora (MAX_ENCUENTROS_HORA).
create function public.encuentros_antes_insertar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.lugares where id = new.lugar_id and activo) then
    raise exception 'El lugar no existe' using errcode = 'P0002';
  end if;

  new.creado_en  := now();
  new.vence_en   := ((now() at time zone 'America/Santiago')::date + time '23:59') at time zone 'America/Santiago';
  new.llegada_en := null;

  if not new.es_demo then
    perform pg_advisory_xact_lock(hashtextextended('encuentro:' || new.device_id, 0));
    if (
      select count(*) from public.encuentros
      where device_id = new.device_id
        and not es_demo
        and creado_en > now() - interval '1 hour'
    ) >= 3 then
      raise exception 'Ya creaste 3 encuentros en la última hora'
        using errcode = 'P0001', hint = 'limite_encuentros';
    end if;
  end if;

  loop
    new.codigo := public.generar_codigo_encuentro();
    exit when not exists (select 1 from public.encuentros where codigo = new.codigo);
  end loop;

  return new;
end;
$$;

create trigger encuentros_antes_insertar
before insert on public.encuentros
for each row execute function public.encuentros_antes_insertar();

-- Crea un encuentro y devuelve su código. Las reglas viven en el trigger.
create function public.crear_encuentro(
  p_lugar_id uuid, p_hora time, p_personas int, p_nota text, p_device_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_codigo text;
begin
  insert into public.encuentros (lugar_id, hora, personas, nota, device_id)
  values (p_lugar_id, p_hora, p_personas, nullif(trim(p_nota), ''), p_device_id)
  returning codigo into v_codigo;
  return v_codigo;
end;
$$;

-- -----------------------------------------------------------------------------
-- RLS (activo en todas las tablas; sin policies de UPDATE/DELETE)
-- -----------------------------------------------------------------------------

alter table public.lugares     enable row level security;
alter table public.reportes    enable row level security;
alter table public.patrones    enable row level security;
alter table public.encuentros  enable row level security;
alter table public.asistencias enable row level security;

create policy "anon lee lugares"     on public.lugares     for select to anon using (true);
create policy "anon lee patrones"    on public.patrones    for select to anon using (true);
create policy "anon lee encuentros"  on public.encuentros  for select to anon using (true);
create policy "anon lee asistencias" on public.asistencias for select to anon using (true);

-- Necesaria para estado_actual (security_invoker) y para Realtime sobre reportes.
-- Solo SELECT; el INSERT de reportes es exclusivo de insert_reporte().
create policy "anon lee reportes"    on public.reportes    for select to anon using (true);

create policy "anon crea encuentros" on public.encuentros for insert to anon
  with check (true);  -- reglas en el trigger encuentros_antes_insertar

create policy "anon confirma asistencia" on public.asistencias for insert to anon
  with check (
    exists (
      select 1 from public.encuentros e
      where e.codigo = encuentro_codigo and e.vence_en > now()
    )
  );

-- -----------------------------------------------------------------------------
-- Permisos explícitos ("Automatically expose new tables" está desactivado)
-- -----------------------------------------------------------------------------

revoke all on table
  public.lugares, public.reportes, public.patrones, public.encuentros,
  public.asistencias, public.estado_actual
from public, anon, authenticated;

grant select on table public.lugares, public.patrones, public.estado_actual to anon;

-- Lectura sin device_id (evita vincular un device con sus lugares, horarios y nombre).
grant select (codigo, lugar_id, hora, personas, nota, creado_en, vence_en, llegada_en, es_demo)
  on table public.encuentros to anon;
grant select (encuentro_codigo, nombre, creado_en)
  on table public.asistencias to anon;
-- Requerido por estado_actual (security_invoker) y Realtime; sin device_id.
grant select (id, lugar_id, nivel, es_demo, creado_en)
  on table public.reportes to anon;

-- INSERT solo en las columnas que el cliente puede elegir (no es_demo, código, fechas ni llegada).
grant insert (lugar_id, hora, personas, nota, device_id) on table public.encuentros  to anon;
grant insert (encuentro_codigo, device_id, nombre)       on table public.asistencias to anon;

revoke execute on function
  public.insert_reporte(uuid, public.nivel_ocupacion, uuid),
  public.marcar_llegada(text, uuid, boolean),
  public.crear_encuentro(uuid, time, int, text, uuid),
  public.generar_codigo_encuentro(),
  public.encuentros_antes_insertar()
from public, anon, authenticated;

grant execute on function
  public.insert_reporte(uuid, public.nivel_ocupacion, uuid),
  public.marcar_llegada(text, uuid, boolean),
  public.crear_encuentro(uuid, time, int, text, uuid)
to anon;

-- -----------------------------------------------------------------------------
-- Realtime: publicar cambios de reportes y encuentros
-- (Realtime entrega a cada suscriptor solo filas y columnas que su rol puede leer.)
-- -----------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reportes') then
      alter publication supabase_realtime add table public.reportes;
    end if;
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'encuentros') then
      alter publication supabase_realtime add table public.encuentros;
    end if;
  end if;
end;
$$;

commit;
