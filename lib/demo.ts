import { cookies } from "next/headers";
import { DEMO_COOKIE } from "./config";

// Solo servidor. El modo demo está activo salvo que se haya abierto la app con ?demo=off
// (proxy.ts guarda la cookie).
export async function demoActivo(): Promise<boolean> {
  return (await cookies()).get(DEMO_COOKIE)?.value !== "off";
}
