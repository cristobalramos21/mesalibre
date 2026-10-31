import { NextResponse, type NextRequest } from "next/server";
import { DEMO_COOKIE, DEMO_COOKIE_DIAS } from "@/lib/config";

// ?demo=off desactiva los datos de demostración (cookie por DEMO_COOKIE_DIAS); ?demo=on los reactiva.
// Redirige a la misma URL sin el parámetro para que los links compartidos queden limpios.
export function proxy(request: NextRequest) {
  const demo = request.nextUrl.searchParams.get("demo");
  if (demo !== "off" && demo !== "on") return NextResponse.next();

  const url = request.nextUrl.clone();
  url.searchParams.delete("demo");
  const respuesta = NextResponse.redirect(url);
  if (demo === "off") {
    respuesta.cookies.set(DEMO_COOKIE, "off", {
      path: "/",
      maxAge: 60 * 60 * 24 * DEMO_COOKIE_DIAS,
      sameSite: "lax",
    });
  } else {
    respuesta.cookies.delete(DEMO_COOKIE);
  }
  return respuesta;
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico).*)"],
};
