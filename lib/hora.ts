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

function deMinutos(total: number): string {
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
