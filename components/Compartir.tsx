"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Link2, MessageCircle, Share2 } from "lucide-react";

const sinSuscripcion = () => () => {};

// F8 · navigator.share() cuando existe; respaldo: WhatsApp y "Copiar link".
export function Compartir({ codigo, lugar, hora }: { codigo: string; lugar: string; hora: string }) {
  // Vacíos en el servidor y durante la hidratación.
  const origen = useSyncExternalStore(sinSuscripcion, () => window.location.origin, () => "");
  const puedeCompartir = useSyncExternalStore(
    sinSuscripcion,
    () => typeof navigator.share === "function",
    () => false,
  );
  const [copiado, setCopiado] = useState(false);

  const link = `${origen}/e/${codigo}`;
  const texto = `Almorzamos en ${lugar} a las ${hora} · ${link}`;
  const listo = origen !== "";

  const compartir = async () => {
    try {
      await navigator.share({ text: texto });
    } catch {
      // Cancelado por el usuario o no permitido: quedan los otros botones.
    }
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Respaldo para navegadores sin Clipboard API (o sin permiso).
      const campo = document.createElement("textarea");
      campo.value = link;
      campo.setAttribute("readonly", "");
      campo.style.position = "fixed";
      campo.style.opacity = "0";
      document.body.appendChild(campo);
      campo.select();
      try {
        document.execCommand("copy");
      } finally {
        campo.remove();
      }
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  return (
    <div className="flex flex-col gap-2">
      {puedeCompartir && (
        <button
          type="button"
          onClick={compartir}
          className="inline-flex min-h-13 items-center justify-center gap-2 rounded-xl bg-foreground text-lg font-bold text-background"
        >
          <Share2 aria-hidden size={20} /> Compartir
        </button>
      )}
      <div className="flex gap-2">
        <a
          href={listo ? `https://wa.me/?text=${encodeURIComponent(texto)}` : undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!listo}
          className={`inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl font-semibold ${
            puedeCompartir ? "border border-foreground bg-card" : "bg-libre text-white"
          }`}
        >
          <MessageCircle aria-hidden size={18} /> WhatsApp
        </a>
        <button
          type="button"
          onClick={copiar}
          disabled={!listo}
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-foreground bg-card font-semibold disabled:opacity-60"
        >
          {copiado ? <Check aria-hidden size={18} /> : <Link2 aria-hidden size={18} />}
          {copiado ? "Copiado" : "Copiar link"}
        </button>
      </div>
      <p role="status" aria-live="polite" className="min-h-5 text-center text-sm text-libre">
        {copiado ? "Link copiado. Pégalo en el chat de tu grupo." : ""}
      </p>
    </div>
  );
}
