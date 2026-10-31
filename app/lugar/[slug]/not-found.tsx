import Link from "next/link";

export default function LugarNoEncontrado() {
  return (
    <div className="pt-10">
      <h1 className="text-2xl font-bold">No encontramos ese lugar</h1>
      <p className="mt-1 text-muted">Puede que el link esté mal escrito o que el lugar ya no esté activo.</p>
      <Link
        href="/"
        className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-foreground px-5 font-semibold text-background"
      >
        Ver todos los lugares
      </Link>
    </div>
  );
}
