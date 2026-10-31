# CLAUDE.md — MVP "Mesas para almorzar en San Joaquín"

IIC3182 Interfaces Humano-Computador · Grupo 10 · Entrega 2
Fuentes: Informe E1 (investigación) + Especificación del MVP (28-10-2026).

> **Regla del curso:** la IA puede escribir CÓDIGO. No puede producir journeys, justificaciones de
> diseño, citas ni reflexión del informe. No generes texto para el informe. Todo uso de IA se
> declara en el anexo (herramienta, prompt, qué produjo, qué se modificó). Los mensajes de commit
> deben indicar si hubo IA (ej. sufijo `[IA]`). Cada integrante commitea con su propio usuario.

Los valores marcados **`[DECIDIR]`** están pendientes del equipo. Usa el valor por defecto indicado
y déjalo en `lib/config.ts` para cambiarlo en un solo lugar.

---

## 1. Qué es

Web app mobile-first que, **antes de caminar**, le dice al estudiante si su **lugar habitual** de
almuerzo tiene espacio para **su grupo**. Si no, muestra **2–3 alternativas cercanas compatibles** y
permite **avisarle al grupo** dónde juntarse con un **link que abre sin cuenta**.

**No es un sistema de reservas.** El E1 concluye que el problema es la *incertidumbre previa al
desplazamiento*, no la falta de reservas, y deja abierta la forma de la solución.

### Hallazgos del E1 que condicionan el producto
| Hallazgo E1 | Implicancia en código |
|---|---|
| Tema 1: todos parten por su lugar habitual y no consultan nada antes (P1, P2, P3) | El lugar habitual va primero en el inicio, sin toques extra |
| Tema 2: hay un "encargado" que asegura la mesa para el grupo (P2) | Usuario principal = encargado; el resto solo abre un link |
| Tema 3: el valor de la mesa varía; para P1 es opcional (pasto) | Cero fricción: sin login, sin onboarding, sin permisos obligatorios, sin push |
| No existe fuente confiable de ocupación | Dato = reportes de usuarios + patrones observados; siempre con antigüedad |
| Disponibilidad varía por día, etapa del semestre, clima, eventos en patios (P2, P3) | Patrones por día/bloque (Should) + aviso temporal de clima/evento (Should) |
| P3 necesita lugar seco, mesa y sillas; el clima inhabilita lugares | Filtros: techado, con sillas |
| Microondas es paso previo para quien trae comida (P2, P3), pero fuera del alcance | Solo atributo informativo "microondas cerca"; sin filas |
| Sombra y enchufes no tienen respaldo en entrevistas | **No incluir** como filtros |
| Peak: 13:15–13:50, amigos salen a las 13:30, clase siguiente 14:50 (P2) | Uso con una mano, caminando; textos de un vistazo, sin formularios largos |

### Necesidades → peso en el MVP
- **N1** saber si hay espacio antes de desplazarse (P1, P2, P3) → núcleo.
- **N2** que quepa el grupo (P1, P2, P3) → núcleo; el tamaño del grupo filtra todo.
- **N3** buenas condiciones: mesa, sillas, seco (solo P3) → secundaria, atributos fijos.
- **N4** alternativas si falla el habitual (P1, P3) → núcleo de la tarea 2.

---

## 2. Tareas que la app debe permitir completar de punta a punta `[DECIDIR: confirmar]`

| Tarea | Resultado verificable | Recorrido |
|---|---|---|
| **T1** Saber, antes de salir de clases, si tu lugar habitual tiene espacio para tu grupo | El usuario dice el nivel y hace cuánto se reportó | Inicio → (si no hay lugar guardado) tocar lugar → Ficha |
| **T2** Encontrar otro lugar cercano donde quepa tu grupo cuando el habitual está lleno | Elige alternativa con capacidad suficiente y estado libre/pocas | Ficha lleno → bloque alternativas → tocar una → Ficha alternativa |
| **T3** Avisarle a tu grupo dónde y a qué hora se juntan | Existe link con lugar, hora y personas que abre sin cuenta | Ficha → "Juntarnos aquí" → hora/personas → "Crear y compartir" → integrante abre `/e/[codigo]` → "Voy" |

### Objetivos medibles (se evalúan en la E3)
- **O1** Estado del lugar habitual en ≤ 2 toques; al reabrir, aparece primero sin toques.
- **O2** Alternativa compatible en ≤ 3 toques desde la ficha del lugar lleno.
- **O3** El link del encuentro abre en navegador limpio, sin instalar ni crear cuenta.
- **O4** Ningún estado aparece sin su antigüedad ("hace X min" o "Sin información reciente").
- **O5** Funciona en Chrome Android y Safari iOS, ventana privada, sin login.
- **O6** Un lugar en "pocas" con 2 encuentros activos se muestra como alta demanda y no se ofrece como alternativa.

---

## 3. Stack

| Capa | Elección |
|---|---|
| Framework | Next.js 14+ App Router + TypeScript |
| Estilos | Tailwind CSS (shadcn/ui opcional). Colores de los 4 estados como variables en un solo lugar |
| BD | Supabase (Postgres + Realtime). Clave anon en cliente, RLS en todas las tablas |
| Deploy | Vercel conectado a GitHub. PR → preview, `main` → producción. URL viva hasta fines de noviembre |
| Mapa (Could) | react-leaflet + OpenStreetMap, sin API key |
| Identidad | `device_id` UUID en localStorage (no es auth). Todo acceso a localStorage dentro de try/catch |
| Keep-alive | Ping semanal a Supabase (GitHub Action o Vercel cron) para que no se pause el plan gratuito |

Zona horaria de toda la lógica de horas y vencimientos: **America/Santiago**.

---

## 4. Configuración central — `lib/config.ts`

```ts
export const FRESHNESS_MIN = 10;        // [DECIDIR] 10 o 20 (el borrador E2 dice ambos)
export const REPORT_COOLDOWN_MIN = 5;   // 1 reporte por device y lugar cada 5 min (en BD)
export const DEMAND_BEFORE_MIN = 10;    // ventana "grupo en camino"
export const DEMAND_AFTER_MIN = 20;
export const DEMAND_WARN = 1;           // [DECIDIR] pocas + 1 grupo → "pocas · alta demanda"
export const DEMAND_FULL = 2;           // [DECIDIR] pocas + ≥2 → tratado como lleno
export const DEMAND_LIBRE = 3;          // [DECIDIR] libre + ≥3 → "pocas · alta demanda"
export const MAX_ENCUENTROS_HORA = 3;   // por device
export const WALK_M_PER_MIN = 80;
export const N_ALTERNATIVAS = 3;
export const GRUPO_RANGOS = [ {label:'1',min:1}, {label:'2–3',min:2}, {label:'4–6',min:4}, {label:'7+',min:7} ];
export const GRUPO_DEFAULT = '4–6';
export const POLL_MS = 60_000;          // respaldo si falla Realtime
export const RELATIVE_TIME_TICK_MS = 30_000;
```
Los umbrales de demanda NO salen de datos del E1; son iniciales y se calibran.

---

## 5. Modelo de datos (Supabase)

**`lugares`**: `id uuid pk`, `slug text unique`, `nombre text`, `zona text` (Ingeniería, College,
Enfermería…), `capacidad_personas int`, `num_mesas int null`, `techado bool`, `con_sillas bool`,
`microondas_cerca bool`, `dist_microondas_m int null`, `tiene_mesa bool` (false para "Pasto"),
`lat float8`, `lng float8`, `aviso_texto text null`, `aviso_hasta timestamptz null`, `activo bool`.

**`reportes`**: `id bigint identity pk`, `lugar_id uuid fk`, `nivel nivel_ocupacion`
(enum `'libre'|'pocas'|'lleno'`), `device_id uuid`, `es_demo bool default false`,
`creado_en timestamptz default now()`. Índice `(lugar_id, creado_en desc)`.

**`patrones`** (Should): `lugar_id uuid fk`, `dia_semana int 1–5`, `bloque text` ('13:00','13:30','14:00'),
`nivel_tipico nivel_ocupacion`.

**`encuentros`**: `codigo text pk` (6 chars, alfabeto sin 0/O/1/l/I), `lugar_id uuid fk`, `hora time`,
`personas int`, `nota text check(len ≤ 80)`, `creado_en timestamptz`, `vence_en timestamptz`
(23:59 hora Chile del mismo día), `device_id uuid`, `llegada_en timestamptz null`, `es_demo bool default false`.

**`asistencias`**: `encuentro_codigo text fk`, `nombre text null check(len ≤ 30)`, `device_id uuid`,
unique `(encuentro_codigo, device_id)`.

**Vista `estado_actual`** (toda la lógica F1 + F20 vive aquí, para que inicio, ficha y encuentro
muestren exactamente lo mismo). Por lugar: `nivel`, `reportado_en`, `n_reportes_10min`, `fresco`,
`grupos_en_camino`, `nivel_efectivo`, `alta_demanda bool`.
- Considerar demo solo si el modo demo está activo (ver §10).
- Para la página de un encuentro, `grupos_en_camino` debe excluir ese mismo encuentro
  (función `estado_lugar(lugar_id, excluir_codigo)` o restarlo en cliente).

### RLS y funciones
- `anon` puede: SELECT en `lugares`, `patrones`, `estado_actual`, `encuentros`, `asistencias`;
  INSERT en `encuentros` y `asistencias`. **No puede UPDATE ni DELETE** directo.
- `insert_reporte(lugar_id, nivel, device_id)` — `security definer`, rechaza si mismo device reportó
  ese lugar hace < 5 min. Es la ÚNICA vía para insertar reportes.
- `marcar_llegada(codigo, device_id, sin_mesa bool)` — `security definer`: setea `llegada_en`; si
  `sin_mesa`, llama a `insert_reporte(..., 'lleno', ...)` (mismo cooldown).
- `crear_encuentro(...)` — `security definer` o trigger: límite 3 por device por hora, genera código.
- Sin datos personales: ni correo, ni teléfono; nombre solo opcional en asistencias.
- Limpieza opcional: cron semanal borra encuentros vencidos y reportes > 30 días.

---

## 6. Lógica de negocio

### F1 · Estado de ocupación
- Niveles: **libre** (hay mesas para grupos), **pocas** (1–2 mesas o compartir), **lleno**, **sin información reciente**.
- Reportes dentro de `FRESHNESS_MIN`: gana el más reciente. Si hay ≥ 3 reportes en los últimos 10 min y
  no coinciden: gana el más repetido; empate → el más reciente.
- Texto: "hace un momento" (< 1 min), "hace X min"; fuera de ventana → "Sin información reciente".
  Si hay patrón (F12): segunda línea "Normalmente: lleno a esta hora".
- Actualización: suscripción Realtime a `reportes`/`encuentros`; respaldo polling 60 s. "hace X min"
  se recalcula en cliente cada 30 s.

### F20 · Demanda en camino → `nivel_efectivo`
Grupo en camino = encuentro no vencido del lugar, `hora` entre now−10 y now+20 min, `llegada_en is null`.

| Reportado | Grupos en camino | Se muestra | En alternativas (F6) |
|---|---|---|---|
| libre | 0–2 | Libre | Se recomienda |
| libre | ≥ 3 | Pocas mesas · alta demanda | Se recomienda, después de los libres |
| pocas | 0 | Pocas mesas | Se recomienda, con plan B visible |
| pocas | 1 | Pocas mesas · alta demanda | Penalizado en el ranking |
| pocas | ≥ 2 | Alta demanda · N grupos van hacia acá | Tratado como lleno: NO se ofrece |
| lleno | cualquiera | Lleno | No se recomienda |

Texto "N grupos van hacia acá" junto al estado, siempre con antigüedad.

### F2 · Lugar habitual
Botón estrella "Es mi lugar" en la ficha → guarda `slug` en localStorage. Sin lugar guardado, el inicio
muestra "¿Dónde almuerzas normalmente?" con 5 lugares comunes `[DECIDIR: cuáles]`; no bloquea.

### F3 / F4 · Grupo y filtros
- Control segmentado 1 / 2–3 / 4–6 / 7+ (default 4–6, recordado en localStorage).
- Compatible si `capacidad_personas ≥ min del rango`.
- Chips acumulativos (AND): **techado**, **mesa con sillas**, **microondas cerca**. Estado vacío sugiere
  qué filtro quitar.

### F5 · Ficha `/lugar/[slug]`
Orden: nombre + zona → estado con antigüedad (+ grupos en camino) → **si lleno o no cabe el grupo:
bloque de alternativas aquí** → capacidad ("~8 mesas · grupos de hasta 6") → condiciones con íconos →
aviso clima/evento → acciones. Acción principal abajo: **"Juntarnos aquí"**; secundarias: "¿Cómo está
ahora?" (reportar), "Es mi lugar".

### F6 · Alternativas (+ F22)
- Candidatos: activos, ≠ actual, compatibles con grupo y filtros, `nivel_efectivo` libre o pocas (no
  "tratado como lleno"). Si no hay: incluir "sin información" con patrón favorable, marcados "sin confirmar".
- Orden: (estado efectivo: libre < pocas < pocas·alta demanda) → grupos en camino asc (F22) →
  distancia haversine desde el lugar actual → frescura. Mostrar 3.
- Tarjeta: nombre, "X min caminando" (= distancia / 80), estado con antigüedad, botón "Ver".
- `[DECIDIR]` si "Pasto" (`tiene_mesa=false`) puede aparecer como alternativa.

### F7 / F8 / F9 · Encuentro
- Form `/lugar/[slug]/juntarnos`: hora (default próxima media hora; atajos "Ahora", "13:30", "13:45"),
  personas (precargado desde F3), nota opcional ≤ 80. Botón "Crear y compartir".
- Redirige a `/e/[codigo]?nuevo=1`: confirmación + compartir.
- Compartir: `navigator.share()` con texto "Almorzamos en {lugar} a las {hora} · {link}"; respaldo
  WhatsApp `https://wa.me/?text=...` y "Copiar link".
- Página pública `/e/[codigo]`: lugar, hora, nota, estado en vivo, botón "Voy" (nombre opcional),
  lista de quiénes van, reportar, "Llegué" y "Llegué y no hay mesa".
- Si el lugar pasa a lleno / alta demanda antes de que el grupo llegue: aviso en vivo con alternativas
  F6, sin recargar.
- Open Graph generado en servidor con nombre del lugar y hora (preview en WhatsApp).
- Encuentro vencido: mostrar estado "Este encuentro ya terminó".

### F10 · Reportar
Hoja inferior con 3 botones grandes (Libre / Pocas / Lleno). Un toque → `insert_reporte` →
"Gracias, actualizado". Si cooldown: mensaje amable "Ya reportaste este lugar hace poco".

### F21 · Llegué y no hay mesa
Ambos botones marcan llegada (deja de contar como en camino). "No hay mesa" además reporta "lleno" y
muestra alternativas de inmediato; los otros grupos en camino lo ven en vivo. "Llegué" ofrece reportar
el estado real con un toque.

---

## 7. Pantallas y rutas

| Pantalla | Ruta |
|---|---|
| Inicio: tarjeta grande "Mi lugar" con estado, selector grupo, chips, lista por estado y luego cercanía al habitual | `/` |
| Ficha | `/lugar/[slug]` |
| Reportar | hoja inferior sobre ficha / encuentro |
| Crear encuentro | `/lugar/[slug]/juntarnos` |
| Encuentro creado | `/e/[codigo]?nuevo=1` |
| Encuentro público | `/e/[codigo]` |
| Mapa (Could) | `/mapa` |
| Acerca de | `/acerca` — qué es, de dónde salen los datos, aviso de prototipo académico y datos de demostración |

---

## 8. Lineamientos de interfaz (reglas de construcción)
- 360–430 px; en escritorio columna centrada máx 480 px.
- Estado = color + ícono + texto (ej. verde + ✓ + "Libre"). Contraste WCAG AA.
- Dato en vivo vs patrón histórico con estilos visualmente distintos (ej. patrón en gris/itálica con ícono de reloj).
- Zonas táctiles ≥ 44×44 px; acción principal abajo, al alcance del pulgar.
- Sin login, onboarding ni permisos obligatorios. Geolocalización solo opcional (Could).
- Vocabulario del campus: "El Castaño", "Patio de la Virgen", zonas Ingeniería / College / Enfermería.
- Español de Chile, frases cortas, sin tecnicismos.
- Primera vista útil < 2 s en 4G (inicio con server components, sin librerías pesadas).

---

## 9. Lugares iniciales (seed)

Mencionados en el E1. Capacidad, condiciones y coordenadas **no salen del E1**: valores provisionales
marcados en el seed hasta tener datos de terreno `[DECIDIR: quién los levanta]`.

| slug | Nombre | Zona | Origen E1 | Notas |
|---|---|---|---|---|
| el-castano | El Castaño | Ingeniería | P2 (habitual) | Escenario demo: siempre lleno |
| cafeteria-ingenieria | Cafetería de Ingeniería | Ingeniería | P2 | Confirmar si se puede comer comida traída |
| patio-ingenieria | Patio de Ingeniería | Ingeniería | P2 | Eventos frecuentes |
| patio-virgen | Patio de la Virgen | Ingeniería | P2 | |
| enfermeria | Facultad de Enfermería | Enfermería | P2 (alternativa) | |
| college | College | College | P1 | |
| pasto | Pasto / áreas verdes | — | P1, P3 | `tiene_mesa=false`, fiel al caso P1 |
| (otros) | Lugares secos de emergencia | — | P3 | Preguntar a P3 cuáles son |

Objetivo: 8–12 lugares.

---

## 10. Datos de demostración (la E3 debe poder probar a cualquier hora)
- `seed_demo()`: si el último reporte demo tiene > 10 min, inserta reportes `es_demo=true` con hora
  actual. Se llama al cargar el inicio (debounce en servidor) o con cron cada 10 min.
- **Escenario fijo:** El Castaño siempre "lleno" para 4–6; ≥ 2 alternativas libre/pocas a < 5 min
  caminando; 1–2 lugares "sin información reciente".
- Opcional: 1–2 encuentros demo hacia una alternativa para que se vea F20.
- Etiqueta discreta "datos de demostración" en el footer + explicación en `/acerca`.
- `?demo=off` desactiva los datos demo (para prueba real en campus).

---

## 11. Prioridades (MoSCoW) y orden de recorte
- **Must** (sin esto no se completan T1–T3): F1, F2, F3, F4, F5, F6, F7, F8, F9, F10, F11.
- **Should:** F20 demanda en camino, F21 llegué y no hay mesa, F12 patrones, F13 aviso clima/evento.
- **Could:** F14 mapa, F15 cercanía real (geolocalización), F22 reparto de recomendaciones.
- **Won't:** reservas formales, sensores, cuentas/perfiles/push, casinos y filas de microondas.

Orden de recorte si falta tiempo: F14, F15 → F22 → F13 → F12 → F21 → F20 → Realtime (polling 60 s).
Las Must no se recortan.

---

## 12. Checklist de aceptación antes de entregar
- [ ] URL pública Vercel abre en Chrome Android y Safari iOS en ventana privada, sin login.
- [ ] T1, T2 y T3 completables de punta a punta con datos demo, a cualquier hora.
- [ ] Ningún estado sin antigüedad (O4).
- [ ] Con 2 encuentros hacia un lugar en "pocas", se muestra alta demanda y sale de alternativas (O6).
- [ ] Link de encuentro con preview correcto en WhatsApp.
- [ ] RLS activo; anon no puede UPDATE/DELETE; cooldown de reportes probado.
- [ ] Repo visible para profesora y ayudante; keep-alive de Supabase configurado.
- [ ] Prompts y aportes de IA registrados para el anexo.
