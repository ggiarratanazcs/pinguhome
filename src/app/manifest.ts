import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Uchi",
    short_name: "Uchi",
    description: "La casa, la spesa e le cose di tutti i giorni, in due.",
    start_url: "/",
    display: "standalone",
    background_color: "#e8f0f6",
    theme_color: "#1d2340",
    lang: "it",
    icons: [{ src: "/icon.png", sizes: "512x512", type: "image/png" }],
  };
}
