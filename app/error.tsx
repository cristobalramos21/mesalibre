"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RotateCw } from "lucide-react";

// H9 · Cualquier error al cargar una pantalla: explica qué pasó y deja reintentar
// (retry() vuelve a pedir los datos al servidor) o volver al inicio.
export default function ErrorPantalla({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="pt-10">
      <h1 className="text-2xl font-bold">No pudimos cargar esta pantalla</h1>
      <p className="mt-1 text-muted">Puede ser tu conexión o un problema nuestro. Prueba de nuevo.</p>
      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => retry()}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-foreground px-5 text-lg font-bold text-background"
        >
          <RotateCw aria-hidden size={20} /> Reintentar
        </button>
        <Link
          href="/"
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-foreground bg-card px-5 font-semibold"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
