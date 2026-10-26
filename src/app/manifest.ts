import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "VAELORA: Plan, Track, Analyze",
    short_name: "VAELORA",
    description:
      "Outdoor planning and local walking/running activity recording.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#08090b",
    theme_color: "#08090b",
    // The final VAELORA V (scripts/brand-icons.mjs). New artwork gets a new
    // folder, so installs never pick up a cached older icon.
    icons: [
      {
        src: "/icons/v25/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/v25/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/v25/maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/v25/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
