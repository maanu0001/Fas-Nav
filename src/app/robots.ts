import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Geschützte und nicht indexierbare Bereiche ausschliessen.
        disallow: ["/dashboard", "/api/", "/login", "/passwort-vergessen", "/passwort-zuruecksetzen", "/suche"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
