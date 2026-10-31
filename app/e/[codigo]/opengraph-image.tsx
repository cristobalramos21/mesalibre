import { ImageResponse } from "next/og";
import { cargarEncuentroConLugar, normalizarCodigo } from "@/lib/datos";
import { formatearHora } from "@/lib/hora";

// Preview del link en WhatsApp: lugar y hora grandes, legibles en miniatura.
export const alt = "Lugar y hora del almuerzo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Mismos valores que app/globals.css (ImageResponse no lee variables CSS).
const FONDO = "#fafaf9";
const TEXTO = "#1c1917";
const SUAVE = "#57534e";
const VERDE = "#166534";
const VERDE_FONDO = "#dcfce7";

export default async function Imagen({ params }: { params: Promise<{ codigo: string }> }) {
  const codigo = normalizarCodigo((await params).codigo);
  // null: código inexistente o error de carga → imagen neutra, sin «Almorzamos en».
  let lugar: string | null = null;
  let hora: string | null = null;
  try {
    const datos = codigo ? await cargarEncuentroConLugar(codigo) : null;
    if (datos) {
      lugar = datos.lugar.nombre;
      hora = formatearHora(datos.encuentro.hora);
    }
  } catch (e) {
    console.error("opengraph-image:", e);
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: FONDO,
          color: TEXTO,
        }}
      >
        <div style={{ display: "flex", fontSize: 36, fontWeight: 700, color: SUAVE }}>Mesa Libre</div>
        {lugar ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 48, color: SUAVE }}>Almorzamos en</div>
            <div style={{ display: "flex", fontSize: lugar.length > 22 ? 84 : 104, fontWeight: 700, lineHeight: 1.05 }}>
              {lugar}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", fontSize: 72, fontWeight: 700, lineHeight: 1.1 }}>
            ¿Hay mesa para tu grupo?
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {hora && (
            <div
              style={{
                display: "flex",
                fontSize: 72,
                fontWeight: 700,
                color: VERDE,
                background: VERDE_FONDO,
                borderRadius: 28,
                padding: "8px 32px",
              }}
            >
              {hora}
            </div>
          )}
          <div style={{ display: "flex", fontSize: 36, color: SUAVE }}>
            {lugar ? "Toca para ver si hay mesa" : "Revísalo antes de caminar"}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
