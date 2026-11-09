import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PinguHome",
    short_name: "PinguHome",
    description: "La casa, la spesa e le cose di tutti i giorni, in due.",
    start_url: "/",
    display: "standalone",
    background_color: "#eef4f5",
    theme_color: "#0d5f6b",
    lang: "it",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
