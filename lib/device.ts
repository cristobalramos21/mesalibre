import { CLAVES, guardar, leer } from "./almacen";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function nuevoUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Respaldo para navegadores sin randomUUID (contexto no seguro).
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// Identificador anónimo del dispositivo (no es auth). Solo en el cliente.
export function obtenerDeviceId(): string {
  const guardado = leer(CLAVES.deviceId);
  if (guardado && UUID.test(guardado)) return guardado;
  const id = nuevoUuid();
  guardar(CLAVES.deviceId, id);
  return id;
}
