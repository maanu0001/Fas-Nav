import { Prisma } from "@prisma/client";
import type { EventType, OrganizationType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { startOfToday } from "@/lib/dates";
import { eventSearchWhere, normalizeSearchTerm, organizationSearchWhere } from "@/lib/search";

/**
 * Zentrale Lesezugriffe für den öffentlichen Bereich.
 * Nur veröffentlichte Inhalte verlassen diese Ebene – Draft, Unpublished
 * und Suspended sind für Besucher grundsätzlich unsichtbar.
 */

export const PUBLIC_ORG_SELECT = {
  id: true,
  name: true,
  slug: true,
  type: true,
  tagline: true,
  shortDescription: true,
  city: true,
  startDate: true,
  endDate: true,
  foundedYear: true,
  verification: true,
  claimStatus: true,
  isFeatured: true,
  canton: { select: { code: true, name: true, slug: true } },
  logo: { select: { url: true, alt: true, width: true, height: true } },
  header: { select: { url: true, alt: true, width: true, height: true } },
} satisfies Prisma.OrganizationSelect;

export const PUBLIC_EVENT_SELECT = {
  id: true,
  title: true,
  slug: true,
  type: true,
  shortDescription: true,
  startDate: true,
  endDate: true,
  allDay: true,
  venueName: true,
  city: true,
  price: true,
  ticketUrl: true,
  isFeatured: true,
  canton: { select: { code: true, name: true, slug: true } },
  organization: { select: { name: true, slug: true, type: true } },
  image: { select: { url: true, alt: true, width: true, height: true } },
} satisfies Prisma.EventSelect;

/** Sichtbarkeitsfilter für Organisationen. */
export const publishedOrgWhere: Prisma.OrganizationWhereInput = {
  status: "PUBLISHED",
};

/** Veranstaltungen sind nur sichtbar, wenn auch die Organisation publiziert ist. */
export const publishedEventWhere: Prisma.EventWhereInput = {
  status: "PUBLISHED",
  organization: { status: "PUBLISHED" },
};

export type OrganizationFilters = {
  type: OrganizationType;
  q?: string;
  canton?: string;
  region?: string;
  city?: string;
  sort?: "name" | "upcoming" | "newest";
  foundedFrom?: number;
  page?: number;
  perPage?: number;
};

export async function buildOrganizationWhere(
  filters: OrganizationFilters,
): Promise<Prisma.OrganizationWhereInput> {
  // Jede Bedingung steht als eigener Eintrag in `AND`. Das ist der Grund,
  // weshalb hier kein Objektliteral mehr zusammengespreizt wird: Kanton und
  // Region schrieben beide auf den Schlüssel `canton`, die Region hat den
  // Kantonsfilter also überschrieben. In einer Liste kann das nicht passieren.
  const bedingungen: Prisma.OrganizationWhereInput[] = [];

  if (filters.canton) bedingungen.push({ canton: { slug: filters.canton } });
  if (filters.region) bedingungen.push({ canton: { region: filters.region } });
  if (filters.city) bedingungen.push({ city: { contains: filters.city, mode: "insensitive" } });
  if (filters.foundedFrom) bedingungen.push({ foundedYear: { gte: filters.foundedFrom } });

  const suche = filters.q ? await organizationSearchWhere(filters.q) : null;
  if (suche) bedingungen.push(suche);

  return {
    ...publishedOrgWhere,
    type: filters.type,
    ...(bedingungen.length ? { AND: bedingungen } : {}),
  };
}

export async function findOrganizations(filters: OrganizationFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const perPage = Math.min(48, filters.perPage ?? 12);

  const where = await buildOrganizationWhere(filters);

  const orderBy: Prisma.OrganizationOrderByWithRelationInput[] =
    filters.sort === "newest"
      ? [{ isFeatured: "desc" }, { createdAt: "desc" }]
      : filters.sort === "upcoming"
        ? [{ isFeatured: "desc" }, { startDate: "asc" }, { name: "asc" }]
        : [{ isFeatured: "desc" }, { name: "asc" }];

  const [items, total] = await Promise.all([
    prisma.organization.findMany({
      where,
      select: PUBLIC_ORG_SELECT,
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.organization.count({ where }),
  ]);

  return { items, total, page, perPage, totalPages: Math.max(1, Math.ceil(total / perPage)) };
}

export type EventFilters = {
  q?: string;
  canton?: string;
  region?: string;
  city?: string;
  type?: EventType;
  organizationSlug?: string;
  organizationType?: OrganizationType;
  from?: Date;
  to?: Date;
  /** Wenn true, werden vergangene Veranstaltungen ausgeblendet. */
  upcomingOnly?: boolean;
  page?: number;
  perPage?: number;
};

export function buildEventWhere(filters: EventFilters): Prisma.EventWhereInput {
  const today = startOfToday();
  const from = filters.from;
  const to = filters.to;

  /**
   * Alle Teilbedingungen landen in dieser Liste und werden am Ende mit `AND`
   * verknüpft.
   *
   * Früher wurden sie in ein einzelnes Objektliteral gespreizt. Mehrere davon
   * brauchen aber den Schlüssel `OR` – die Suche, der Zeitraum und der Filter
   * auf kommende Termine. In einem Objektliteral gewinnt der letzte gleiche
   * Schlüssel, alle vorherigen verschwinden ohne Fehlermeldung. In der Agenda
   * traf das genau die Suche: Sie stand vor dem Filter auf kommende Termine
   * und wurde deshalb bei jeder Anfrage verworfen. Die Adresse enthielt den
   * Suchbegriff, die Trefferliste zeigte trotzdem alle Veranstaltungen.
   */
  const bedingungen: Prisma.EventWhereInput[] = [];

  if (filters.type) bedingungen.push({ type: filters.type });
  if (filters.canton) bedingungen.push({ canton: { slug: filters.canton } });
  if (filters.region) bedingungen.push({ canton: { region: filters.region } });
  if (filters.city) bedingungen.push({ city: { contains: filters.city, mode: "insensitive" } });

  if (filters.organizationSlug || filters.organizationType) {
    bedingungen.push({
      organization: {
        status: "PUBLISHED",
        ...(filters.organizationSlug ? { slug: filters.organizationSlug } : {}),
        ...(filters.organizationType ? { type: filters.organizationType } : {}),
      },
    });
  }

  const suche = filters.q ? eventSearchWhere(filters.q) : null;
  if (suche) bedingungen.push(suche);

  // Eine Veranstaltung gilt als „kommend“, solange ihr Ende in der Zukunft liegt.
  if (filters.upcomingOnly) {
    bedingungen.push({
      OR: [{ endDate: { gte: today } }, { endDate: null, startDate: { gte: today } }],
    });
  }

  if (from) {
    bedingungen.push({
      OR: [{ endDate: { gte: from } }, { endDate: null, startDate: { gte: from } }],
    });
  }
  if (to) bedingungen.push({ startDate: { lte: to } });

  return {
    ...publishedEventWhere,
    ...(bedingungen.length ? { AND: bedingungen } : {}),
  };
}

export async function findEvents(filters: EventFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const perPage = Math.min(100, filters.perPage ?? 20);
  const where = buildEventWhere(filters);

  const [items, total] = await Promise.all([
    prisma.event.findMany({
      where,
      select: PUBLIC_EVENT_SELECT,
      orderBy: [{ startDate: "asc" }, { title: "asc" }],
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.event.count({ where }),
  ]);

  return { items, total, page, perPage, totalPages: Math.max(1, Math.ceil(total / perPage)) };
}

export async function upcomingEvents(limit = 6, cantonSlug?: string) {
  return prisma.event.findMany({
    where: buildEventWhere({ upcomingOnly: true, canton: cantonSlug }),
    select: PUBLIC_EVENT_SELECT,
    orderBy: [{ isFeatured: "desc" }, { startDate: "asc" }],
    take: limit,
  });
}

export async function featuredOrganizations(type: OrganizationType, limit = 3, ids?: string[]) {
  // Manuell im Homepage-CMS gesetzte Auswahl hat Vorrang.
  if (ids?.length) {
    const picked = await prisma.organization.findMany({
      where: { id: { in: ids }, ...publishedOrgWhere },
      select: PUBLIC_ORG_SELECT,
    });
    const order = new Map(ids.map((id, i) => [id, i]));
    const sorted = picked.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    if (sorted.length >= limit) return sorted.slice(0, limit);

    const fill = await prisma.organization.findMany({
      where: { type, ...publishedOrgWhere, id: { notIn: sorted.map((o) => o.id) } },
      select: PUBLIC_ORG_SELECT,
      orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
      take: limit - sorted.length,
    });
    return [...sorted, ...fill];
  }

  return prisma.organization.findMany({
    where: { type, ...publishedOrgWhere },
    select: PUBLIC_ORG_SELECT,
    orderBy: [{ isFeatured: "desc" }, { verification: "desc" }, { updatedAt: "desc" }],
    take: limit,
  });
}

/** Kantonsübersicht mit Zählern für Navigation und SEO-Landingpages. */
export async function cantonOverview() {
  const cantons = await prisma.canton.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      slug: true,
      region: true,
      _count: {
        select: {
          organizations: { where: publishedOrgWhere },
          events: { where: publishedEventWhere },
        },
      },
    },
  });

  return cantons.map((c) => ({
    ...c,
    organizationCount: c._count.organizations,
    eventCount: c._count.events,
  }));
}

export async function platformCounts() {
  const [carnivals, guggen, events, cantons] = await Promise.all([
    prisma.organization.count({ where: { ...publishedOrgWhere, type: "CARNIVAL" } }),
    prisma.organization.count({ where: { ...publishedOrgWhere, type: "GUGGE" } }),
    prisma.event.count({ where: buildEventWhere({ upcomingOnly: true }) }),
    prisma.canton.count(),
  ]);
  return { carnivals, guggen, events, cantons };
}

/** Globale Suche über Organisationen, Veranstaltungen und Orte. */
export async function globalSearch(term: string) {
  const q = normalizeSearchTerm(term);
  if (q.length < 2) {
    return { carnivals: [], guggen: [], events: [], cantons: [], total: 0 };
  }

  // Dieselbe Feldliste wie in den Verzeichnissen – siehe lib/search.ts.
  const orgSuche = await organizationSearchWhere(q);

  const [organizations, events, cantons] = await Promise.all([
    prisma.organization.findMany({
      where: { ...publishedOrgWhere, ...(orgSuche ? { AND: [orgSuche] } : {}) },
      select: PUBLIC_ORG_SELECT,
      orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
      take: 24,
    }),
    prisma.event.findMany({
      where: buildEventWhere({ q, upcomingOnly: true }),
      select: PUBLIC_EVENT_SELECT,
      orderBy: { startDate: "asc" },
      take: 12,
    }),
    prisma.canton.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { code: { equals: q.toUpperCase() } },
          { region: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { code: true, name: true, slug: true, region: true },
      take: 6,
    }),
  ]);

  const carnivals = organizations.filter((o) => o.type === "CARNIVAL");
  const guggen = organizations.filter((o) => o.type === "GUGGE");

  return {
    carnivals,
    guggen,
    events,
    cantons,
    total: organizations.length + events.length + cantons.length,
  };
}
