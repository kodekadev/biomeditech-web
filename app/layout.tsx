import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Biomeditech CRM",
  description: "Prototipo CRM para gestión de leads, clientes, productos y cotizaciones.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
