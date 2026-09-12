import type { Metadata } from "next";
import type { ReactNode } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import "./planner.css";

export const metadata: Metadata = {
  title: "VAELORA — Find your best time outside",
  description: "Intelligent outdoor planning for Jordan. Find where and when to run or walk. Starting with verified Greater Amman activity areas.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
