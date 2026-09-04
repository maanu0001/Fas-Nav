import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";

import { ToastProvider } from "@/components/ui/toast";
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
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#12203a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de-CH" className={`${sans.variable} ${display.variable}`}>
      <body className="min-h-dvh font-sans">
        <a
          href="#inhalt"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground"
        >
          Zum Inhalt springen
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
