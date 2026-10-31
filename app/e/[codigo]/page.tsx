import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";
import { Encuentro } from "@/components/Encuentro";
import { ErrorCarga } from "@/components/ErrorCarga";
import { Pie } from "@/components/Pie";
import { cargarEncuentroConLugar, cargarPaginaEncuentro, describirError, normalizarCodigo } from "@/lib/datos";
import { demoActivo } from "@/lib/demo";
import { formatearHora } from "@/lib/hora";

// Compartido entre generateMetadata y la página (una sola consulta por request).
const encuentroConLugar = cache(async (codigo: string) => {
  try {
    return { ok: true as const, datos: await cargarEncuentroConLugar(codigo) };
  } catch (e) {
    return describirError(e, "No pudimos cargar el encuentro. Revisa tu conexión e intenta de nuevo.");
  }
});

// Open Graph para el preview en WhatsApp. La imagen sale de opengraph-image.tsx.
export async function generateMetadata({ params }: PageProps<"/e/[codigo]">): Promise<Metadata> {
  const codigo = normalizarCodigo((await params).codigo);
  const resultado = codigo ? await encuentroConLugar(codigo) : null;
  if (!resultado?.ok || !resultado.datos) {
    return { title: "Encuentro · Mesa Libre", robots: { index: false } };
  }
  const { encuentro, lugar } = resultado.datos;
  const titulo = `Almorzamos en ${lugar.nombre} a las ${formatearHora(encuentro.hora)}`;
  const descripcion = "Mira si hay mesa ahora y avisa que vas. Se abre sin cuenta.";
  return {
    title: titulo,
    description: descripcion,
    robots: { index: false },
    openGraph: { title: titulo, description: descripcion, type: "website", siteName: "Mesa Libre", locale: "es_CL" },
    twitter: { card: "summary_large_image", title: titulo, description: descripcion },
  };
}

export default function PaginaEncuentro({ params, searchParams }: PageProps<"/e/[codigo]">) {
  return (
    <Suspense fallback={<EncuentroCargando />}>
      <DatosEncuentro params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function DatosEncuentro({
  params,
  searchParams,
}: Pick<PageProps<"/e/[codigo]">, "params" | "searchParams">) {
  const codigo = normalizarCodigo((await params).codigo);
  if (!codigo) notFound();
  const { nuevo } = await searchParams;
  const demo = await demoActivo();

  const base = await encuentroConLugar(codigo);
  if (!base.ok) return <ErrorEncuentro mensaje={base.mensaje} detalle={base.detalle} />;
  if (!base.datos) notFound();
  const datos = await cargarPaginaEncuentro(base.datos.encuentro, base.datos.lugar, demo);
  if (!datos.ok) return <ErrorEncuentro mensaje={datos.mensaje} detalle={datos.detalle} />;

  return (
    <>
      <Encuentro
        encuentro={datos.encuentro}
        asistencias={datos.asistencias}
        estados={datos.estados}
        lugar={datos.lugar}
        lugares={datos.lugares}
        leidoEnMs={datos.leidoEnMs}
        demo={demo}
        nuevo={nuevo === "1"}
      />
      <Pie demo={demo} />
    </>
  );
}

function ErrorEncuentro({ mensaje, detalle }: { mensaje: string; detalle?: string }) {
  return (
    <div className="pt-6">
      <ErrorCarga mensaje={mensaje} detalle={detalle} />
    </div>
  );
}

function EncuentroCargando() {
  return (
    <div className="flex flex-col gap-4 pt-14" aria-busy="true" aria-label="Cargando encuentro">
      <div className="h-5 w-32 animate-pulse rounded bg-border/60" />
      <div className="h-9 w-2/3 animate-pulse rounded-lg bg-border/60" />
      <div className="h-28 animate-pulse rounded-2xl bg-border/60" />
      <div className="h-16 animate-pulse rounded-xl bg-border/60" />
    </div>
  );
}
