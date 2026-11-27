import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { ErrorCarga } from "@/components/ErrorCarga";
import { FormEncuentro } from "@/components/FormEncuentro";
import { cargarEstados, cargarLugarPorSlug, describirError } from "@/lib/datos";
import { demoActivo } from "@/lib/demo";

// Compartido entre generateMetadata y la página (una sola consulta por request).
const lugarPorSlug = cache(cargarLugarPorSlug);

export async function generateMetadata({ params }: PageProps<"/lugar/[slug]/juntarnos">): Promise<Metadata> {
  const { slug } = await params;
  try {
    const lugar = await lugarPorSlug(slug);
    return { title: lugar ? `Juntarnos en ${lugar.nombre} · Mesa Libre` : "Lugar no encontrado · Mesa Libre" };
  } catch {
    return { title: "Mesa Libre" };
  }
}

export default function PaginaJuntarnos({ params }: PageProps<"/lugar/[slug]/juntarnos">) {
  return (
    <Suspense fallback={<FormCargando />}>
      <DatosFormulario params={params} />
    </Suspense>
  );
}

async function cargar(slug: string, demo: boolean) {
  try {
    // El estado del lugar solo sirve para avisar (H5): si falla, el formulario igual se muestra.
    const [lugar, estados] = await Promise.all([
      lugarPorSlug(slug),
      cargarEstados(demo).catch((e) => {
        console.error("juntarnos · estados:", e);
        return [];
      }),
    ]);
    return { ok: true as const, lugar, estados, leidoEnMs: Date.now() };
  } catch (e) {
    return describirError(e, "No pudimos cargar el lugar. Revisa tu conexión e intenta de nuevo.");
  }
}

async function DatosFormulario({ params }: { params: PageProps<"/lugar/[slug]/juntarnos">["params"] }) {
  const { slug } = await params;
  const demo = await demoActivo();
  const datos = await cargar(slug, demo);

  if (!datos.ok) {
    return (
      <div className="pt-6">
        <ErrorCarga mensaje={datos.mensaje} detalle={datos.detalle} />
      </div>
    );
  }
  if (!datos.lugar) notFound();

  return (
    <div className="flex flex-1 flex-col">
      <Link
        href={`/lugar/${datos.lugar.slug}`}
        className="-ml-2 mt-2 inline-flex min-h-11 w-fit items-center gap-1 px-2 text-sm font-medium text-muted"
      >
        <ArrowLeft aria-hidden size={18} /> {datos.lugar.nombre}
      </Link>
      <h1 className="mt-1 text-2xl font-bold leading-tight">Juntarnos en {datos.lugar.nombre}</h1>
      <p className="text-muted">
        Crea un link para avisarle a tu grupo dónde y a qué hora. No reserva la mesa.
      </p>
      <FormEncuentro lugar={datos.lugar} estadosIniciales={datos.estados} leidoEnMs={datos.leidoEnMs} demo={demo} />
    </div>
  );
}

function FormCargando() {
  return (
    <div className="flex flex-col gap-4 pt-14" aria-busy="true" aria-label="Cargando">
      <div className="h-9 w-2/3 animate-pulse rounded-lg bg-border/60" />
      <div className="h-24 animate-pulse rounded-xl bg-border/60" />
      <div className="h-16 animate-pulse rounded-xl bg-border/60" />
    </div>
  );
}
