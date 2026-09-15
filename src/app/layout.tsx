import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import "./planner.css";
import "./dashboard.css";
import "./fitness.css";
export const viewport: Viewport = {themeColor:"#102a3a",width:"device-width",initialScale:1,viewportFit:"cover"};

export const metadata: Metadata = {
  appleWebApp:{capable:true,statusBarStyle:"default",title:"VAELORA"},
  icons:{icon:"/icon.svg",apple:"/icons/icon-192.png"},
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
