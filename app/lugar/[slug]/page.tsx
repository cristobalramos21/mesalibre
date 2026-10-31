import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ErrorCarga } from "@/components/ErrorCarga";
import { Ficha } from "@/components/Ficha";
import { Pie } from "@/components/Pie";
import { cargarLugarPorSlug, cargarLugaresYEstados } from "@/lib/datos";
import { demoActivo } from "@/lib/demo";

export async function generateMetadata({ params }: PageProps<"/lugar/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  try {
    const lugar = await cargarLugarPorSlug(slug);
    return { title: lugar ? `${lugar.nombre} · Mesa Libre` : "Lugar no encontrado · Mesa Libre" };
  } catch {
    return { title: "Mesa Libre" };
  }
}

export default function PaginaLugar({ params }: PageProps<"/lugar/[slug]">) {
  return (
    <Suspense fallback={<FichaCargando />}>
      <DatosFicha params={params} />
    </Suspense>
  );
}

// Se cargan todos los lugares: hacen falta para las alternativas (F6).
async function DatosFicha({ params }: { params: PageProps<"/lugar/[slug]">["params"] }) {
  const { slug } = await params;
  const demo = await demoActivo();
  const datos = await cargarLugaresYEstados(demo);

  if (!datos.ok) {
    return (
      <div className="pt-6">
        <ErrorCarga mensaje={datos.mensaje} detalle={datos.detalle} />
      </div>
    );
  }

  const lugar = datos.lugares.find((l) => l.slug === slug);
  if (!lugar) notFound();

  return (
    <>
      <Ficha
        lugar={lugar}
        lugares={datos.lugares}
        estadosIniciales={datos.estados}
        leidoEnMs={datos.leidoEnMs}
        demo={demo}
      />
      <Pie demo={demo} />
    </>
  );
}

function FichaCargando() {
  return (
    <div className="flex flex-col gap-4 pt-14" aria-busy="true" aria-label="Cargando lugar">
      <div className="h-9 w-2/3 animate-pulse rounded-lg bg-border/60" />
      <div className="h-9 w-40 animate-pulse rounded-full bg-border/60" />
      <div className="h-24 animate-pulse rounded-xl bg-border/60" />
    </div>
  );
}
