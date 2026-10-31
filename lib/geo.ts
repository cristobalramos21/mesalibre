import { WALK_M_PER_MIN } from "./config";

type Punto = { lat: number; lng: number };

// Distancia en línea recta (haversine), en metros.
export function distanciaM(a: Punto, b: Punto): number {
  const R = 6_371_000;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function minutosCaminando(metros: number): number {
  return Math.max(1, Math.ceil(metros / WALK_M_PER_MIN));
}
