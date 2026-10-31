import { Suspense } from "react";
import { ErrorCarga } from "@/components/ErrorCarga";
import { Inicio } from "@/components/Inicio";
import { Pie } from "@/components/Pie";
import { cargarLugaresYEstados } from "@/lib/datos";
import { demoActivo } from "@/lib/demo";

export default function PaginaInicio() {
  return (
    <>
      <header className="pt-6 pb-4">
        <h1 className="text-2xl font-bold tracking-tight">Mesa Libre</h1>
        <p className="text-muted">¿Hay mesa para tu grupo? Revísalo antes de caminar.</p>
      </header>
      <Suspense fallback={<InicioCargando />}>
        <DatosInicio />
      </Suspense>
    </>
  );
}

// El estado cambia minuto a minuto: se lee en cada request (cookies() lo hace dinámico).
async function DatosInicio() {
  const demo = await demoActivo();
  const datos = await cargarLugaresYEstados(demo);
  return (
    <>
      {datos.ok ? (
        <Inicio
          lugares={datos.lugares}
          estadosIniciales={datos.estados}
          leidoEnMs={datos.leidoEnMs}
          demo={demo}
        />
      ) : (
        <ErrorCarga mensaje={datos.mensaje} detalle={datos.detalle} />
      )}
      <Pie demo={demo} />
    </>
  );
}

function InicioCargando() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Cargando lugares">
      <div className="h-36 animate-pulse rounded-2xl bg-border/60" />
      <div className="h-12 animate-pulse rounded-xl bg-border/60" />
      <ul className="flex flex-col gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i} className="h-16 animate-pulse rounded-xl bg-border/60" />
        ))}
      </ul>
    </div>
  );
}
