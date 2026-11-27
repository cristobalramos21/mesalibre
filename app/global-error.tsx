"use client";

// Error en el layout raíz: reemplaza todo el documento, así que no hay estilos globales.
export default function ErrorGlobal({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="es-CL">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, background: "#fafaf9", color: "#1c1917" }}>
        <title>Mesa Libre</title>
        <main role="alert" style={{ maxWidth: 480, margin: "0 auto", padding: "40px 16px" }}>
          <h1 style={{ fontSize: 24, margin: 0 }}>No pudimos cargar Mesa Libre</h1>
          <p style={{ color: "#57534e" }}>Puede ser tu conexión. Prueba de nuevo.</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              minHeight: 48,
              width: "100%",
              borderRadius: 12,
              border: 0,
              background: "#1c1917",
              color: "#fafaf9",
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}
