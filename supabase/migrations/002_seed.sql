-- =============================================================================
-- Mesa Libre · 002_seed.sql
-- Lugares iniciales (CLAUDE.md §9), mencionados en el E1.
-- Nombre, zona y tiene_mesa de Pasto vienen del E1. Capacidad, mesas, condiciones,
-- microondas y coordenadas NO: son valores provisionales, marcados línea a línea.
-- Coordenadas aproximadas dentro del Campus San Joaquín (Av. Vicuña Mackenna 4860).
--
-- Se puede volver a ejecutar: al cambiar un valor y re-correr, se actualiza por slug.
-- Ejecutar después de 001_schema.sql.
-- =============================================================================

begin;

insert into public.lugares
  (slug, nombre, zona, capacidad_personas, num_mesas, techado, con_sillas,
   microondas_cerca, dist_microondas_m, tiene_mesa, lat, lng)
values
-- El Castaño · habitual de P2 · escenario demo: siempre lleno
(
  'el-castano', 'El Castaño', 'Ingeniería',
  40,         -- capacidad_personas  -- PROVISIONAL: levantar en terreno
  8,          -- num_mesas           -- PROVISIONAL: levantar en terreno
  false,      -- techado             -- PROVISIONAL: levantar en terreno
  true,       -- con_sillas          -- PROVISIONAL: levantar en terreno
  true,       -- microondas_cerca    -- PROVISIONAL: levantar en terreno
  60,         -- dist_microondas_m   -- PROVISIONAL: levantar en terreno
  true,       -- tiene_mesa
  -33.49905,  -- lat                 -- PROVISIONAL: levantar en terreno
  -70.61395   -- lng                 -- PROVISIONAL: levantar en terreno
),
-- Cafetería de Ingeniería · P2 · confirmar si se puede comer comida traída
(
  'cafeteria-ingenieria', 'Cafetería de Ingeniería', 'Ingeniería',
  60,         -- capacidad_personas  -- PROVISIONAL: levantar en terreno
  12,         -- num_mesas           -- PROVISIONAL: levantar en terreno
  true,       -- techado             -- PROVISIONAL: levantar en terreno
  true,       -- con_sillas          -- PROVISIONAL: levantar en terreno
  true,       -- microondas_cerca    -- PROVISIONAL: levantar en terreno
  20,         -- dist_microondas_m   -- PROVISIONAL: levantar en terreno
  true,       -- tiene_mesa
  -33.49960,  -- lat                 -- PROVISIONAL: levantar en terreno
  -70.61425   -- lng                 -- PROVISIONAL: levantar en terreno
),
-- Patio de Ingeniería · P2 · eventos frecuentes
(
  'patio-ingenieria', 'Patio de Ingeniería', 'Ingeniería',
  50,         -- capacidad_personas  -- PROVISIONAL: levantar en terreno
  10,         -- num_mesas           -- PROVISIONAL: levantar en terreno
  false,      -- techado             -- PROVISIONAL: levantar en terreno
  true,       -- con_sillas          -- PROVISIONAL: levantar en terreno
  false,      -- microondas_cerca    -- PROVISIONAL: levantar en terreno
  150,        -- dist_microondas_m   -- PROVISIONAL: levantar en terreno
  true,       -- tiene_mesa
  -33.49935,  -- lat                 -- PROVISIONAL: levantar en terreno
  -70.61460   -- lng                 -- PROVISIONAL: levantar en terreno
),
-- Patio de la Virgen · P2
(
  'patio-virgen', 'Patio de la Virgen', 'Ingeniería',
  30,         -- capacidad_personas  -- PROVISIONAL: levantar en terreno
  6,          -- num_mesas           -- PROVISIONAL: levantar en terreno
  false,      -- techado             -- PROVISIONAL: levantar en terreno
  false,      -- con_sillas          -- PROVISIONAL: levantar en terreno
  false,      -- microondas_cerca    -- PROVISIONAL: levantar en terreno
  200,        -- dist_microondas_m   -- PROVISIONAL: levantar en terreno
  true,       -- tiene_mesa
  -33.49865,  -- lat                 -- PROVISIONAL: levantar en terreno
  -70.61355   -- lng                 -- PROVISIONAL: levantar en terreno
),
-- Facultad de Enfermería · alternativa de P2
(
  'enfermeria', 'Facultad de Enfermería', 'Enfermería',
  40,         -- capacidad_personas  -- PROVISIONAL: levantar en terreno
  8,          -- num_mesas           -- PROVISIONAL: levantar en terreno
  true,       -- techado             -- PROVISIONAL: levantar en terreno
  true,       -- con_sillas          -- PROVISIONAL: levantar en terreno
  true,       -- microondas_cerca    -- PROVISIONAL: levantar en terreno
  40,         -- dist_microondas_m   -- PROVISIONAL: levantar en terreno
  true,       -- tiene_mesa
  -33.49790,  -- lat                 -- PROVISIONAL: levantar en terreno
  -70.61300   -- lng                 -- PROVISIONAL: levantar en terreno
),
-- College · P1
(
  'college', 'College', 'College',
  45,         -- capacidad_personas  -- PROVISIONAL: levantar en terreno
  9,          -- num_mesas           -- PROVISIONAL: levantar en terreno
  true,       -- techado             -- PROVISIONAL: levantar en terreno
  true,       -- con_sillas          -- PROVISIONAL: levantar en terreno
  true,       -- microondas_cerca    -- PROVISIONAL: levantar en terreno
  50,         -- dist_microondas_m   -- PROVISIONAL: levantar en terreno
  true,       -- tiene_mesa
  -33.49730,  -- lat                 -- PROVISIONAL: levantar en terreno
  -70.61440   -- lng                 -- PROVISIONAL: levantar en terreno
),
-- Pasto / áreas verdes · P1, P3 · sin mesa (fiel al caso P1), sin zona
(
  'pasto', 'Pasto / áreas verdes', null,
  100,        -- capacidad_personas  -- PROVISIONAL: levantar en terreno
  null,       -- num_mesas (no aplica)
  false,      -- techado
  false,      -- con_sillas
  false,      -- microondas_cerca    -- PROVISIONAL: levantar en terreno
  null,       -- dist_microondas_m   -- PROVISIONAL: levantar en terreno
  false,      -- tiene_mesa
  -33.49820,  -- lat                 -- PROVISIONAL: levantar en terreno
  -70.61490   -- lng                 -- PROVISIONAL: levantar en terreno
)
-- Lugares secos de emergencia (P3): pendientes, preguntar a P3 cuáles son.
on conflict (slug) do update set
  nombre             = excluded.nombre,
  zona               = excluded.zona,
  capacidad_personas = excluded.capacidad_personas,
  num_mesas          = excluded.num_mesas,
  techado            = excluded.techado,
  con_sillas         = excluded.con_sillas,
  microondas_cerca   = excluded.microondas_cerca,
  dist_microondas_m  = excluded.dist_microondas_m,
  tiene_mesa         = excluded.tiene_mesa,
  lat                = excluded.lat,
  lng                = excluded.lng;

commit;
