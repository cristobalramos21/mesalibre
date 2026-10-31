import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  DEMAND_AFTER_MIN,
  DEMAND_BEFORE_MIN,
  DEMO_COOKIE_DIAS,
  FRESHNESS_MIN,
  MAX_ENCUENTROS_HORA,
  REPORT_COOLDOWN_MIN,
} from "@/lib/config";

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

      <Seccion titulo="Encuentros">
        <p>
          Desde la ficha de un lugar, «Juntarnos aquí» crea un link con el lugar y la hora para
          mandárselo a tu grupo. Quien lo abre ve el estado del lugar en vivo y puede marcar «Voy»
          (el nombre es opcional), sin crear cuenta. Al llegar, «Llegué» saca a tu grupo de los que
          van en camino. «Llegué y no hay mesa» además reporta el lugar como lleno. Los encuentros
          duran hasta las 23:59 del día en que se crean.
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
            reciente». Si en ese rato hay 3 o más reportes, gana el más repetido; si hay menos, gana el
            más reciente.
          </li>
          <li>
            «N grupos van hacia acá» cuenta los encuentros en ese lugar con hora entre hace{" "}
            {DEMAND_BEFORE_MIN} y dentro de {DEMAND_AFTER_MIN} minutos, que todavía no marcan
            «Llegué».
          </li>
          <li>
            La capacidad, las condiciones y las distancias son aproximadas y se están revisando en
            terreno.
          </li>
        </ul>
      </Seccion>

      <Seccion titulo="Sin cuenta">
        <p>
          No pedimos correo, teléfono ni contraseña. Tu navegador crea un identificador anónimo y lo
          guarda junto con tu lugar habitual, el tamaño de tu grupo, tus filtros y los encuentros
          donde dijiste «Voy». Ese identificador también queda en nuestra base de datos con cada
          reporte, encuentro y «Voy», pero otros usuarios no lo ven. Sirve para poner límites: un
          reporte por lugar cada {REPORT_COOLDOWN_MIN} minutos, {MAX_ENCUENTROS_HORA} encuentros por
          hora y un «Voy» por encuentro. Si eliges «Usar solo reportes reales», una cookie lo
          recuerda por {DEMO_COOKIE_DIAS} días. El nombre que escribas al marcar «Voy» es público.
        </p>
      </Seccion>

      <Seccion titulo="Datos de demostración">
        <p>
          Para que la app se pueda probar a cualquier hora, algunos lugares muestran estados de
          ejemplo que se renuevan solos: El Castaño aparece lleno, y hay 2 grupos de ejemplo en
          camino al Patio de Ingeniería, que por eso aparece con alta demanda. En ese modo el pie de
          página dice «Datos de demostración». Los reportes, encuentros y «Voy» que hagas son
          reales y los ven los demás.
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
