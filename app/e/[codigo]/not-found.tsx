import Link from "next/link";

export default function EncuentroNoEncontrado() {
  return (
    <div className="pt-10">
      <h1 className="text-2xl font-bold">No encontramos ese encuentro</h1>
      <p className="mt-1 text-muted">
        Revisa que el link esté completo: el código tiene 6 letras y números.
      </p>
      <Link
        href="/"
        className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-foreground px-5 font-semibold text-background"
      >
        Ver lugares ahora
      </Link>
    </div>
  );
}
