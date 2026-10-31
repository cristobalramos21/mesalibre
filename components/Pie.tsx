import Link from "next/link";

// Pie con la etiqueta discreta de datos de demostración (CLAUDE.md §10).
export function Pie({ demo }: { demo: boolean }) {
  return (
    <footer className="mt-10 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-muted">
      {demo && (
        <>
          <span>Datos de demostración</span>
          <span aria-hidden>·</span>
        </>
      )}
      <Link href="/acerca" className="inline-flex min-h-11 items-center underline underline-offset-2">
        Acerca de Mesa Libre
      </Link>
    </footer>
  );
}
