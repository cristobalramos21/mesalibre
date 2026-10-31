export function ErrorCarga({ mensaje, detalle }: { mensaje: string; detalle?: string }) {
  return (
    <div role="alert" className="rounded-xl border border-lleno/30 bg-lleno-bg p-4 text-lleno">
      <p className="font-semibold">{mensaje}</p>
      {detalle && (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer">Detalle técnico</summary>
          <p className="mt-1 break-words">{detalle}</p>
        </details>
      )}
    </div>
  );
}
