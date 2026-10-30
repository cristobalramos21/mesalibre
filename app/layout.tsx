import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mesa Libre",
  description:
    "Antes de caminar, revisa si tu lugar habitual de almuerzo en San Joaquín tiene mesa para tu grupo.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fafaf9",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-CL" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <main className="mx-auto flex min-h-full w-full max-w-[480px] flex-col px-4 pb-8">
          {children}
        </main>
      </body>
    </html>
  );
}
