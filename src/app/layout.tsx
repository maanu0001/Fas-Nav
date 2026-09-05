import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";

import { ToastProvider } from "@/components/ui/toast";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { SITE } from "@/lib/constants";
import { absoluteUrl } from "@/lib/utils";

import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const display = Manrope({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(absoluteUrl("/")),
  title: {
    default: `${SITE.name} – ${SITE.tagline}`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  authors: [{ name: SITE.name, url: absoluteUrl("/") }],
  creator: SITE.name,
  publisher: SITE.name,
  formatDetection: { telephone: false },
  icons: {
    // Alle Icons stammen aus dem offiziellen Logo: für kleine Flächen auf den
    // Bereich der Buchstaben FN beschnitten, damit möglichst viel davon
    // erkennbar bleibt.
    icon: [
      { url: "/icon.png", type: "image/png", sizes: "64x64" },
      { url: "/brand/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/brand/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  // Farbe der Browserleiste je Modus – Navy des Logos beziehungsweise der
  // dunkle Grundton der Anwendung.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0b1a30" },
    { media: "(prefers-color-scheme: dark)", color: "#070f1c" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: next-themes ergänzt die Klasse am
    // <html>-Element vor der Hydration; ohne diesen Hinweis meldet React die
    // Abweichung zum Serverergebnis.
    <html lang="de-CH" className={`${sans.variable} ${display.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh font-sans">
        <a
          href="#inhalt"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground"
        >
          Zum Inhalt springen
        </a>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
