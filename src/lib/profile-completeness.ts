import type { Prisma } from "@prisma/client";

export type CompletenessCheck = {
  key: string;
  label: string;
  done: boolean;
  href: string;
  weight: number;
};

export type Completeness = {
  percent: number;
  checks: CompletenessCheck[];
  missing: CompletenessCheck[];
};

export const completenessSelect = {
  type: true,
  shortDescription: true,
  description: true,
  logoId: true,
  headerId: true,
  contactEmail: true,
  website: true,
  startDate: true,
  foundedYear: true,
  status: true,
  _count: { select: { socialLinks: true, events: true, media: true } },
} satisfies Prisma.OrganizationSelect;

type Input = Prisma.OrganizationGetPayload<{ select: typeof completenessSelect }>;

/**
 * Bewertet, wie vollständig ein Profil ist.
 * Motiviert Organisationen, ihre Seite zu vervollständigen, und benennt
 * konkret die fehlenden Punkte.
 */
export function profileCompleteness(org: Input): Completeness {
  const isCarnival = org.type === "CARNIVAL";

  const checks: CompletenessCheck[] = [
    {
      key: "description",
      label: "Beschreibung hinzufügen",
      done: Boolean(org.shortDescription || org.description),
      href: "/dashboard/seite#beschreibung",
      weight: 20,
    },
    {
      key: "logo",
      label: "Logo hochladen",
      done: Boolean(org.logoId),
      href: "/dashboard/seite#bilder",
      weight: 15,
    },
    {
      key: "header",
      label: "Titelbild hinzufügen",
      done: Boolean(org.headerId),
      href: "/dashboard/seite#bilder",
      weight: 15,
    },
    {
      key: "contact",
      label: "Kontaktangaben ergänzen",
      done: Boolean(org.contactEmail),
      href: "/dashboard/seite#kontakt",
      weight: 10,
    },
    {
      key: "website",
      label: "Website verlinken",
      done: Boolean(org.website),
      href: "/dashboard/seite#kontakt",
      weight: 5,
    },
    {
      key: "social",
      label: "Social Media hinzufügen",
      done: org._count.socialLinks > 0,
      href: "/dashboard/seite#social",
      weight: 10,
    },
    {
      key: "event",
      label: "Erste Veranstaltung erfassen",
      done: org._count.events > 0,
      href: "/dashboard/veranstaltungen/neu",
      weight: 15,
    },
    {
      key: isCarnival ? "dates" : "founded",
      label: isCarnival ? "Zeitraum der Fasnacht angeben" : "Gründungsjahr angeben",
      done: isCarnival ? Boolean(org.startDate) : Boolean(org.foundedYear),
      href: "/dashboard/seite#grundinformationen",
      weight: 10,
    },
  ];

  const total = checks.reduce((sum, check) => sum + check.weight, 0);
  const earned = checks
    .filter((check) => check.done)
    .reduce((sum, check) => sum + check.weight, 0);

  return {
    percent: Math.round((earned / total) * 100),
    checks,
    missing: checks.filter((check) => !check.done),
  };
}
