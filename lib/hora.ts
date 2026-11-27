import { ATAJOS_HORA } from "./config";

// Horas "HH:MM" en America/Santiago (CLAUDE.md §3), sin importar la zona del dispositivo.
const FORMATO = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function horaSantiago(ms: number): string {
  const partes = FORMATO.formatToParts(ms);
  const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "00";
  return `${valor("hour")}:${valor("minute")}`;
}

export function aMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

export function deMinutos(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// F7: próxima hora en punto o y media (13:12 → 13:30; 13:30 → 14:00). No pasa de 23:59.
export function proximaMediaHora(ms: number): string {
  const siguiente = Math.floor(aMinutos(horaSantiago(ms)) / 30) * 30 + 30;
  return deMinutos(Math.min(siguiente, 23 * 60 + 59));
}

// "13:30:00" (columna time) → "13:30"
export function formatearHora(hora: string): string {
  return hora.slice(0, 5);
}

// F7 · Atajos: "Ahora" + los fijos que todavía no pasan (ATAJOS_HORA). Si ya pasaron todos
// (fuera de la hora de almuerzo), "En 15 min" y "En 30 min", redondeados a 5 min.
export function atajosHora(ahoraMs: number): { etiqueta: string; valor: string }[] {
  const actual = horaSantiago(ahoraMs);
  const min = aMinutos(actual);
  const fijos = ATAJOS_HORA.filter((h) => aMinutos(h) > min).map((h) => ({ etiqueta: h, valor: h }));
  const relativos =
    fijos.length > 0
      ? []
      : [15, 30]
          .map((d) => ({ etiqueta: `En ${d} min`, minutos: Math.ceil((min + d) / 5) * 5 }))
          .filter((a) => a.minutos <= 23 * 60 + 59)
          .map((a) => ({ etiqueta: a.etiqueta, valor: deMinutos(a.minutos) }));
  return [{ etiqueta: "Ahora", valor: actual }, ...fijos, ...relativos];
}
