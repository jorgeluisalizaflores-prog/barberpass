import type { Metadata, Viewport } from "next";
import { NOMBRE_PLATAFORMA } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${NOMBRE_PLATAFORMA} · Tarjetas de fidelidad para barberías`, template: `%s · ${NOMBRE_PLATAFORMA}` },
  description: "Tarjeta de sellos digital para barberías en Perú: tus clientes vuelven más y tú no imprimes nada.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-PE" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
