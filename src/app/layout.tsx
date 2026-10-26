import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Archivo, Cormorant_Garamond, Readex_Pro } from "next/font/google";
import "maplibre-gl/dist/maplibre-gl.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/screens.css";

// Archivo carries the interface and every metric, Readex Pro Arabic, and
// Cormorant Garamond only the VAELORA wordmark. All are self-hosted by
// next/font (font-src 'self').
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});
// The identity sheet sets VAELORA in a widely tracked classical serif.
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-cormorant",
  display: "swap",
});
const readex = Readex_Pro({
  subsets: ["arabic", "latin"],
  variable: "--font-readex",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f6f3" },
    { media: "(prefers-color-scheme: dark)", color: "#08090b" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  appleWebApp: { capable: true, statusBarStyle: "default", title: "VAELORA" },
  title: "VAELORA: find your best time outside",
  description:
    "Weather-aware walking and running for Greater Amman. Find when and where to go, record your outing, and keep your history on your device.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${cormorant.variable} ${readex.variable}`}>
      <body>{children}</body>
    </html>
  );
}
