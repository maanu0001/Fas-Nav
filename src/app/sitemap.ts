import type { MetadataRoute } from "next";

import { prisma } from "@/lib/prisma";
import { startOfToday } from "@/lib/dates";
import { absoluteUrl } from "@/lib/utils";

// Der Sitemap-Inhalt richtet sich nach dem aktuellen Datenbestand.
// Ein Prerendering zur Build-Zeit würde eine leere Sitemap festschreiben.
export const dynamic = "force-dynamic";

/** Dynamische Sitemap über alle öffentlich indexierbaren Seiten. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/agenda"), changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/fasnachten"), changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/guggen"), changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/kantone"), changeFrequency: "weekly", priority: 0.7 },
    { url: absoluteUrl("/preise"), changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/organisation-eintragen"), changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/kontakt"), changeFrequency: "yearly", priority: 0.4 },
    { url: absoluteUrl("/impressum"), changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/datenschutz"), changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/agb"), changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/cookies"), changeFrequency: "yearly", priority: 0.2 },
  ];

  try {
    const [organizations, events, cantons] = await Promise.all([
      prisma.organization.findMany({
        where: { status: "PUBLISHED" },
        select: { slug: true, type: true, updatedAt: true },
        take: 5000,
      }),
      prisma.event.findMany({
        where: {
          status: "PUBLISHED",
          organization: { status: "PUBLISHED" },
          // Lange vergangene Termine belasten die Sitemap unnötig.
          OR: [
            { endDate: { gte: startOfToday() } },
            { endDate: null, startDate: { gte: startOfToday() } },
          ],
        },
        select: { slug: true, updatedAt: true },
        take: 5000,
      }),
      prisma.canton.findMany({ select: { slug: true, updatedAt: true } }),
    ]);

    return [
      ...staticRoutes,
      ...cantons.map((canton) => ({
        url: absoluteUrl(`/kanton/${canton.slug}`),
        lastModified: canton.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
      ...organizations.map((org) => ({
        url: absoluteUrl(
          org.type === "CARNIVAL" ? `/fasnacht/${org.slug}` : `/gugge/${org.slug}`,
        ),
        lastModified: org.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
      ...events.map((event) => ({
        url: absoluteUrl(`/event/${event.slug}`),
        lastModified: event.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ];
  } catch (error) {
    // Ohne Datenbankverbindung bleibt zumindest die statische Sitemap gültig.
    console.error("[sitemap] Dynamische Einträge nicht verfügbar:", error);
    return staticRoutes;
  }
}
