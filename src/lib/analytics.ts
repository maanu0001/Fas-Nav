import { createHash } from "node:crypto";

import type { InteractionType, PageViewTarget } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Erzeugt eine pseudonyme Besucherkennung. Es wird keine Klartext-IP
 * gespeichert (Schweizer Datenschutzgesetz, Grundsatz der Datenminimierung).
 */
export function visitorHash(ip: string | null, userAgent: string | null): string {
  const salt = process.env.AUTH_SECRET ?? "fas-nav";
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256")
    .update(`${salt}|${day}|${ip ?? "-"}|${userAgent ?? "-"}`)
    .digest("hex")
    .slice(0, 32);
}

type TrackInput = {
  target: PageViewTarget;
  interaction?: InteractionType;
  organizationId?: string | null;
  eventId?: string | null;
  path: string;
  visitorHash?: string | null;
  referrer?: string | null;
  meta?: string | null;
};

/** Schreibt einen Seitenaufruf. Fehler bleiben ohne Auswirkung auf die Seite. */
export async function trackView(input: TrackInput): Promise<void> {
  try {
    await prisma.pageView.create({
      data: {
        target: input.target,
        interaction: input.interaction ?? "VIEW",
        organizationId: input.organizationId ?? null,
        eventId: input.eventId ?? null,
        path: input.path.slice(0, 300),
        visitorHash: input.visitorHash ?? null,
        referrer: input.referrer?.slice(0, 300) ?? null,
        meta: input.meta?.slice(0, 200) ?? null,
      },
    });
  } catch (error) {
    console.error("[analytics] Tracking fehlgeschlagen:", error);
  }
}

export async function logSearch(term: string, results: number): Promise<void> {
  const cleaned = term.trim().slice(0, 120);
  if (cleaned.length < 2) return;
  try {
    await prisma.searchQuery.create({ data: { term: cleaned.toLowerCase(), results } });
  } catch (error) {
    console.error("[analytics] Suchanfrage konnte nicht protokolliert werden:", error);
  }
}

export type ViewStats = {
  total: number;
  last30Days: number;
  websiteClicks: number;
  socialClicks: number;
};

export async function organizationStats(organizationId: string): Promise<ViewStats> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [total, last30Days, websiteClicks, socialClicks] = await Promise.all([
    prisma.pageView.count({ where: { organizationId, interaction: "VIEW" } }),
    prisma.pageView.count({
      where: { organizationId, interaction: "VIEW", createdAt: { gte: since } },
    }),
    prisma.pageView.count({ where: { organizationId, interaction: "WEBSITE_CLICK" } }),
    prisma.pageView.count({ where: { organizationId, interaction: "SOCIAL_CLICK" } }),
  ]);
  return { total, last30Days, websiteClicks, socialClicks };
}
