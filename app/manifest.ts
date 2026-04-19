import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Baaki",
    short_name: "Baaki",
    description: "Digital khata for local stores. Record baaki, payments, reminders, and reports.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#fbf7f0",
    theme_color: "#ab2e20",
    categories: ["business", "finance", "productivity"],
    icons: [
      {
        src: "/install-icon-192",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/install-icon-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
