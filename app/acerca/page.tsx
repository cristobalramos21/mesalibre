import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FRESHNESS_MIN, REPORT_COOLDOWN_MIN } from "@/lib/config";

export const metadata: Metadata = {
  title: "Acerca de Mesa Libre",
};

export default function Acerca() {
  return (
    <article className="pb-6">
      <Link href="/" className="-ml-2 mt-2 inline-flex min-h-11 items-center gap-1 px-2 text-sm font-medium text-muted">
        <ArrowLeft aria-hidden size={18} /> Inicio
      </Link>
      <h1 className="mt-1 text-2xl font-bold">Acerca de Mesa Libre</h1>

      <Seccion titulo="Qué es">
        <p>
          Mesa Libre te dice, antes de caminar, si tu lugar habitual de almuerzo en el Campus San
          Joaquín tiene espacio para tu grupo. Si está lleno, te muestra lugares cercanos donde sí
          caben. No es un sistema de reservas.
        </p>
      </Seccion>

      <Seccion titulo="De dónde salen los datos">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            De reportes de otros estudiantes: Libre, Pocas mesas o Lleno. Cada estado muestra hace
            cuánto se reportó.
          </li>
          <li>
            Después de {FRESHNESS_MIN} minutos sin reportes, el lugar aparece como «Sin información
            reciente». Si hay varios reportes distintos, gana el más repetido.
          </li>
          <li>
            «Grupos van hacia acá» cuenta los grupos que avisaron que se juntan en ese lugar en los
            próximos minutos.
          </li>
          <li>
            La capacidad, las condiciones y las distancias son aproximadas y se están revisando en
            terreno.
          </li>
        </ul>
      </Seccion>

      <Seccion titulo="Sin cuenta">
        <p>
          No pedimos correo, teléfono ni contraseña. Tu navegador guarda un identificador anónimo
          para evitar reportes repetidos (uno por lugar cada {REPORT_COOLDOWN_MIN} minutos), junto
          con tu lugar habitual, el tamaño de tu grupo y tus filtros.
        </p>
      </Seccion>

      <Seccion titulo="Datos de demostración">
        <p>
          Para que la app se pueda probar a cualquier hora, algunos lugares muestran estados de
          ejemplo que se renuevan solos (por ejemplo, El Castaño aparece lleno). En ese modo el pie
          de página dice «Datos de demostración».
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link prefetch={false} href="/?demo=off" className="inline-flex min-h-11 items-center rounded-lg border border-foreground px-4 text-sm font-semibold">
            Usar solo reportes reales
          </Link>
          <Link prefetch={false} href="/?demo=on" className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm font-semibold">
            Volver a los datos de demostración
          </Link>
        </div>
      </Seccion>

      <Seccion titulo="Prototipo académico">
        <p>
          Proyecto del curso IIC3182 Interfaces Humano-Computador (Grupo 10), Pontificia
          Universidad Católica de Chile. No es un servicio oficial de la universidad.
        </p>
      </Seccion>
    </article>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-1.5 text-lg font-bold">{titulo}</h2>
      <div className="leading-relaxed">{children}</div>
    </section>
  );
}
