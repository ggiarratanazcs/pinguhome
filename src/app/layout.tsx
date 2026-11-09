import type { Metadata, Viewport } from "next";
import "@fontsource-variable/onest";
import "@fontsource-variable/unbounded";
import { SCRIPT_AVVIO, TEMA_PREDEFINITO } from "@/lib/temi";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "PinguHome", template: "%s · PinguHome" },
  description: "La casa, la spesa e le cose di tutti i giorni, in due.",
  applicationName: "PinguHome",
  appleWebApp: { capable: true, title: "PinguHome", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e8f0f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f20" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" data-theme={TEMA_PREDEFINITO} className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_AVVIO }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
