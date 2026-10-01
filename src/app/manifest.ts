import type { MetadataRoute } from "next";

/**
 * Web App Manifest for SupplyKhata PWA (Steps 1–2).
 * Served by Next at /manifest.webmanifest — no public file needed.
 * orientation: "any" — phones + tablets (delivery / counter use).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SupplyKhata",
    short_name: "SupplyKhata",
    description: "Multi-tenant delivery, orders, and customer khata for supply businesses",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#ffffff",
    theme_color: "#2563eb",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-192-maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
