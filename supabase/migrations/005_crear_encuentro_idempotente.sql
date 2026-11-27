-- =============================================================================
-- Mesa Libre · 005_crear_encuentro_idempotente.sql
-- crear_encuentro acepta una clave del cliente (p_clave). Si el mismo dispositivo
-- reintenta con la misma clave (p. ej. porque la respuesta no le llegó), se devuelve
-- el código del encuentro ya creado: no se duplica ni cuenta para el límite por hora.
--
-- Compatible con el frontend anterior: p_clave tiene default null, así que una llamada
-- con los 5 parámetros de antes sigue funcionando (sin idempotencia).
-- Ejecutar ANTES de desplegar el frontend que envía p_clave. Después de 001–004.
-- =============================================================================

begin;

alter table public.encuentros add column if not exists clave_cliente uuid;

-- Una clave por dispositivo. Parcial: los encuentros sin clave (demo, versión anterior) no cuentan.
create unique index if not exists encuentros_device_clave_idx
  on public.encuentros (device_id, clave_cliente)
  where clave_cliente is not null;

-- clave_cliente no se expone a anon (los grants de SELECT/INSERT de 001 son por columna).

drop function if exists public.crear_encuentro(uuid, time, int, text, uuid);

create function public.crear_encuentro(
  p_lugar_id uuid, p_hora time, p_personas int, p_nota text, p_device_id uuid,
  p_clave uuid default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_codigo text;
begin
  -- Mismo lock que el trigger encuentros_antes_insertar (los advisory locks son
  -- reentrantes en la misma transacción): serializa los reintentos del mismo device,
  -- así la búsqueda y el insert no compiten entre sí.
  perform pg_advisory_xact_lock(hashtextextended('encuentro:' || p_device_id, 0));

  if p_clave is not null then
    select codigo into v_codigo
    from public.encuentros
    where device_id = p_device_id and clave_cliente = p_clave;
    if v_codigo is not null then
      return v_codigo;
    end if;
  end if;

  insert into public.encuentros (lugar_id, hora, personas, nota, device_id, clave_cliente)
  values (p_lugar_id, p_hora, p_personas, nullif(trim(p_nota), ''), p_device_id, p_clave)
  returning codigo into v_codigo;
  return v_codigo;
end;
$$;

revoke execute on function public.crear_encuentro(uuid, time, int, text, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.crear_encuentro(uuid, time, int, text, uuid, uuid) to anon;

commit;
