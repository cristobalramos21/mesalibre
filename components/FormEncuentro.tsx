"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { ATAJOS_HORA, DEMAND_BEFORE_MIN, MAX_ENCUENTROS_HORA, NOTA_MAX } from "@/lib/config";
import { obtenerDeviceId } from "@/lib/device";
import { useAhora } from "@/lib/en-vivo";
import { aMinutos, horaSantiago, proximaMediaHora } from "@/lib/hora";
import { useGrupo } from "@/lib/preferencias";
import { getSupabase } from "@/lib/supabase";
import type { Lugar } from "@/lib/tipos";

const PERSONAS_MIN = 1;
const PERSONAS_MAX = 50; // check en encuentros.personas

type Envio = "editar" | "enviando" | "limite" | "error";

// F7 · Crear encuentro: hora, personas y nota opcional → /e/[codigo]?nuevo=1
export function FormEncuentro({ lugar, leidoEnMs }: { lugar: Lugar; leidoEnMs: number }) {
  const router = useRouter();
  const ahora = useAhora(leidoEnMs);
  const [grupo] = useGrupo();
  // leidoEnMs viene del servidor: el valor por defecto es igual en servidor y cliente.
  const [hora, setHora] = useState(() => proximaMediaHora(leidoEnMs));
  // null = todavía sin tocar: se precarga con el grupo guardado (F3), que se lee al hidratar.
  const [personasElegidas, setPersonas] = useState<number | null>(null);
  const [nota, setNota] = useState("");
  const [envio, setEnvio] = useState<Envio>("editar");

  const personas = personasElegidas ?? grupo.min;
  const cambiarPersonas = (delta: number) =>
    setPersonas(Math.min(PERSONAS_MAX, Math.max(PERSONAS_MIN, personas + delta)));
  const horaPasada = hora !== "" && aMinutos(hora) < aMinutos(horaSantiago(ahora)) - DEMAND_BEFORE_MIN;

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hora || envio === "enviando") return;
    setEnvio("enviando");
    const { data, error } = await getSupabase().rpc("crear_encuentro", {
      p_lugar_id: lugar.id,
      p_hora: hora,
      p_personas: personas,
      p_nota: nota.trim() || null,
      p_device_id: obtenerDeviceId(),
    });
    if (error || typeof data !== "string") {
      console.error("crear_encuentro:", error);
      setEnvio(error?.hint === "limite_encuentros" ? "limite" : "error");
      return;
    }
    router.push(`/e/${data}?nuevo=1`);
  };

  const atajos = [
    { etiqueta: "Ahora", valor: horaSantiago(ahora) },
    ...ATAJOS_HORA.map((h) => ({ etiqueta: h, valor: h })),
  ];

  return (
    <form onSubmit={crear} className="mt-5 flex flex-1 flex-col">
      <fieldset>
        <legend className="mb-2 text-lg font-bold">¿A qué hora?</legend>
        <div className="flex flex-wrap gap-2">
          {atajos.map((a) => (
            <button
              key={a.etiqueta}
              type="button"
              aria-pressed={hora === a.valor}
              onClick={() => setHora(a.valor)}
              className={`min-h-11 rounded-full border px-4 font-semibold ${
                hora === a.valor ? "border-foreground bg-foreground text-background" : "border-border bg-card"
              }`}
            >
              {a.etiqueta}
            </button>
          ))}
        </div>
        <label className="mt-3 flex items-center gap-3">
          <span className="text-muted">Otra hora</span>
          <input
            type="time"
            required
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            className="min-h-12 rounded-xl border border-border bg-card px-3 text-lg font-semibold"
          />
        </label>
        {horaPasada && (
          <p className="mt-2 text-sm text-pocas">Esa hora ya pasó. Igual puedes crearlo: el link sirve hasta las 23:59 de hoy.</p>
        )}
      </fieldset>

      <fieldset className="mt-6">
        <legend className="mb-2 text-lg font-bold">¿Cuántos van?</legend>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => cambiarPersonas(-1)}
            disabled={personas <= PERSONAS_MIN}
            aria-label="Una persona menos"
            className="inline-flex size-12 items-center justify-center rounded-xl border border-foreground bg-card disabled:opacity-40"
          >
            <Minus aria-hidden size={20} />
          </button>
          <output aria-live="polite" className="min-w-16 text-center text-2xl font-bold">
            {personas}
          </output>
          <button
            type="button"
            onClick={() => cambiarPersonas(1)}
            disabled={personas >= PERSONAS_MAX}
            aria-label="Una persona más"
            className="inline-flex size-12 items-center justify-center rounded-xl border border-foreground bg-card disabled:opacity-40"
          >
            <Plus aria-hidden size={20} />
          </button>
          <span className="text-muted">{personas === 1 ? "persona" : "personas"}</span>
        </div>
      </fieldset>

      <label className="mt-6 block">
        <span className="mb-2 block text-lg font-bold">
          Nota <span className="text-base font-normal text-muted">(opcional)</span>
        </span>
        <input
          type="text"
          value={nota}
          maxLength={NOTA_MAX}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Ej: la mesa larga del fondo"
          className="min-h-12 w-full rounded-xl border border-border bg-card px-3 text-base"
        />
        <span className="mt-1 block text-right text-xs text-muted">
          {nota.length}/{NOTA_MAX}
        </span>
      </label>

      <div className="sticky bottom-0 -mx-4 mt-auto border-t border-border bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        {envio === "limite" && (
          <p role="alert" className="mb-2 rounded-xl bg-pocas-bg p-3 text-sm text-pocas">
            Ya creaste {MAX_ENCUENTROS_HORA} encuentros en la última hora. Espera un rato o busca en el
            chat de tu grupo el link que ya mandaste.
          </p>
        )}
        {envio === "error" && (
          <p role="alert" className="mb-2 rounded-xl bg-lleno-bg p-3 text-sm text-lleno">
            No pudimos crear el encuentro. Revisa tu conexión e intenta de nuevo.
          </p>
        )}
        <button
          type="submit"
          disabled={envio === "enviando" || !hora}
          className="min-h-13 w-full rounded-xl bg-foreground text-lg font-bold text-background disabled:opacity-60"
        >
          {envio === "enviando" ? "Creando…" : "Crear y compartir"}
        </button>
      </div>
    </form>
  );
}
