import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Archivo, Readex_Pro } from "next/font/google";
import "maplibre-gl/dist/maplibre-gl.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/screens.css";

// One variable grotesk whose width axis carries hierarchy (expanded brand,
// normal text, condensed metrics), with Readex Pro for Arabic script. Both are
// self-hosted at build time by next/font, so the CSP keeps font-src 'self'.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});
const readex = Readex_Pro({
  subsets: ["arabic", "latin"],
  variable: "--font-readex",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eceff1" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1018" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  appleWebApp: { capable: true, statusBarStyle: "default", title: "VAELORA" },
  icons: { icon: "/icon.svg", apple: "/icons/icon-192.png" },
  title: "VAELORA: find your best time outside",
  description:
    "Weather-aware walking and running for Greater Amman. Find when and where to go, record your outing, and keep your history on your device.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${readex.variable}`}>
      <body>{children}</body>
    </html>
  );
}
