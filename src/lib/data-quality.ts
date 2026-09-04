import type { OrganizationType, Prisma, VerificationStatus } from "@prisma/client";

import { normaliseName, normaliseUrl, similarity } from "@/lib/import/duplicates";

/**
 * Datenqualität von Organisationsprofilen.
 *
 * Diese Datei ist die einzige Stelle, an der die Kriterien und ihre Gewichte
 * festgelegt sind. Oberflächen lesen das Ergebnis, berechnen aber nichts
 * selbst – sonst driften Bewertung und Anzeige auseinander.
 *
 * Der Wert ist deterministisch: Er ist schlicht die Summe der Gewichte aller
 * erfüllten Kriterien. Die Gewichte ergeben zusammen genau 100, deshalb
 * entspricht die Summe unmittelbar einem Prozentwert und lässt sich Punkt für
 * Punkt nachrechnen.
 */

/** Ohne Nachweis gilt ein Profil ab hier als länger nicht überprüft. */
export const STALE_VERIFICATION_DAYS = 180;

/** Ab diesem Wert gilt ein Profil als sehr gut gepflegt. */
export const QUALITY_GOOD = 80;
/** Unterhalb dieses Werts gilt ein Profil als unvollständig. */
export const QUALITY_INCOMPLETE = 60;

export type QualityCriterionKey =
  | "name"
  | "location"
  | "description"
  | "logo"
  | "header"
  | "contact"
  | "website"
  | "social"
  | "schedule"
  | "profile";

export type QualityCriterion = {
  key: QualityCriterionKey;
  /** Was fehlt, aus Sicht der Administration formuliert. */
  label: string;
  weight: number;
  fulfilled: boolean;
};

/** Hinweise, die nichts über die Vollständigkeit sagen, aber Arbeit bedeuten. */
export type QualityFlag =
  | "STALE_VERIFICATION"
  | "NEVER_VERIFIED"
  | "NEEDS_MANUAL_REVIEW"
  | "INACTIVE"
  | "POSSIBLE_DUPLICATE";

export const QUALITY_FLAG_LABELS: Record<QualityFlag, string> = {
  STALE_VERIFICATION: `Seit über ${STALE_VERIFICATION_DAYS} Tagen nicht überprüft`,
  NEVER_VERIFIED: "Noch nie überprüft",
  NEEDS_MANUAL_REVIEW: "Aus dem Import zur Prüfung vorgemerkt",
  INACTIVE: "Als inaktiv eingestuft",
  POSSIBLE_DUPLICATE: "Mögliche Dublette",
};

/** Felder, die zur Bewertung geladen werden müssen. */
export const dataQualitySelect = {
  id: true,
  type: true,
  name: true,
  slug: true,
  city: true,
  shortDescription: true,
  description: true,
  logoId: true,
  headerId: true,
  contactEmail: true,
  contactPhone: true,
  bookingEmail: true,
  website: true,
  startDate: true,
  endDate: true,
  foundedYear: true,
  musicStyle: true,
  memberCount: true,
  repertoire: true,
  organizerName: true,
  typicalPeriod: true,
  programHighlights: true,
  status: true,
  verification: true,
  activityStatus: true,
  needsManualReview: true,
  lastVerifiedAt: true,
  updatedAt: true,
  canton: { select: { code: true, name: true, slug: true } },
  _count: { select: { socialLinks: true, events: true } },
} satisfies Prisma.OrganizationSelect;

export type QualityInput = Prisma.OrganizationGetPayload<{ select: typeof dataQualitySelect }>;

export type OrganizationQuality = {
  id: string;
  name: string;
  slug: string;
  type: OrganizationType;
  city: string;
  canton: { code: string; name: string; slug: string };
  verification: VerificationStatus;
  lastVerifiedAt: Date | null;
  updatedAt: Date;
  /** 0–100, Summe der erfüllten Gewichte. */
  score: number;
  criteria: QualityCriterion[];
  /** Nicht erfüllte Kriterien, in der Reihenfolge ihres Gewichts. */
  missing: QualityCriterion[];
  flags: QualityFlag[];
  /** Verweise auf Organisationen, die dieselbe Einrichtung sein könnten. */
  duplicateOf: { id: string; name: string; reason: string }[];
  href: string;
};

function filled(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Bewertet ein einzelnes Profil.
 *
 * Die Gewichte spiegeln, wie sehr ein fehlendes Feld die öffentliche Seite
 * entwertet: Ohne Beschreibung oder Logo wirkt ein Eintrag verwaist, während
 * fehlende Zusatzangaben nur Feinschliff sind.
 */
export function evaluateOrganization(org: QualityInput, now: Date = new Date()): OrganizationQuality {
  const isCarnival = org.type === "CARNIVAL";

  const criteria: QualityCriterion[] = [
    {
      key: "name",
      label: "Aussagekräftiger Name",
      weight: 4,
      fulfilled: org.name.trim().length >= 2,
    },
    {
      key: "location",
      label: "Ort",
      weight: 6,
      fulfilled: filled(org.city),
    },
    {
      key: "description",
      label: "Beschreibung",
      weight: 18,
      fulfilled: filled(org.shortDescription) || filled(org.description),
    },
    { key: "logo", label: "Logo", weight: 14, fulfilled: Boolean(org.logoId) },
    { key: "header", label: "Titelbild", weight: 12, fulfilled: Boolean(org.headerId) },
    {
      key: "contact",
      label: "Kontaktmöglichkeit",
      weight: 12,
      fulfilled: filled(org.contactEmail) || filled(org.contactPhone) || filled(org.bookingEmail),
    },
    { key: "website", label: "Website", weight: 8, fulfilled: filled(org.website) },
    { key: "social", label: "Social Media", weight: 8, fulfilled: org._count.socialLinks > 0 },
    {
      key: "schedule",
      label: isCarnival ? "Kommende Ausgabe" : "Gründungsjahr",
      weight: 12,
      // Bei einer Fasnacht zählt nur ein Datum, das noch bevorsteht: Ein
      // vergangener Termin macht die Seite nicht aktuell, sondern veraltet.
      fulfilled: isCarnival
        ? Boolean(org.endDate ?? org.startDate) &&
          (org.endDate ?? org.startDate ?? new Date(0)).getTime() >= now.getTime()
        : Boolean(org.foundedYear),
    },
    {
      key: "profile",
      label: isCarnival ? "Angaben zur Fasnacht" : "Angaben zur Gugge",
      weight: 6,
      fulfilled: isCarnival
        ? filled(org.organizerName) || filled(org.typicalPeriod) || org.programHighlights.length > 0
        : filled(org.musicStyle) || filled(org.repertoire) || Boolean(org.memberCount),
    },
  ];

  const score = criteria.reduce((sum, c) => sum + (c.fulfilled ? c.weight : 0), 0);

  const flags: QualityFlag[] = [];
  if (org.needsManualReview) flags.push("NEEDS_MANUAL_REVIEW");
  if (org.activityStatus === "INACTIVE") flags.push("INACTIVE");
  if (!org.lastVerifiedAt) {
    flags.push("NEVER_VERIFIED");
  } else {
    const days = (now.getTime() - org.lastVerifiedAt.getTime()) / 86_400_000;
    if (days > STALE_VERIFICATION_DAYS) flags.push("STALE_VERIFICATION");
  }

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    type: org.type,
    city: org.city,
    canton: org.canton,
    verification: org.verification,
    lastVerifiedAt: org.lastVerifiedAt,
    updatedAt: org.updatedAt,
    score,
    criteria,
    missing: criteria.filter((c) => !c.fulfilled).sort((a, b) => b.weight - a.weight),
    flags,
    duplicateOf: [],
    href: `/dashboard/organisationen/${org.id}`,
  };
}

/**
 * Sucht Organisationen, die dieselbe Einrichtung sein könnten.
 *
 * Bewusst zurückhaltend und ausschliesslich hinweisend: Es wird nichts
 * zusammengeführt, verändert oder gelöscht. Die Entscheidung trifft die
 * Administration.
 */
const NAME_SIMILARITY_SAME_CITY = 0.75;

/** Zeichenhäufigkeit als Vergleichsschranke, siehe canReach(). */
function charCounts(value: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const ch of value) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  return counts;
}

/**
 * Obere Schranke für die Ähnlichkeit zweier Namen – ohne sie zu berechnen.
 *
 * Die Editierdistanz ist mindestens so gross wie der Längenunterschied und
 * mindestens so gross wie die Zahl der Zeichen, die im jeweils anderen Namen
 * gar nicht vorkommen. Beides lässt sich linear bestimmen, während die
 * Editierdistanz selbst quadratisch ist. Liegt schon die Schranke unter dem
 * Schwellenwert, kann der teure Vergleich entfallen – ohne echte Treffer zu
 * verlieren, denn die Schranke unterschätzt die Ähnlichkeit nie.
 */
function canReach(
  aLen: number,
  bLen: number,
  aCounts: Map<string, number>,
  bCounts: Map<string, number>,
  threshold: number,
): boolean {
  const max = Math.max(aLen, bLen);
  if (!max) return false;
  if (1 - Math.abs(aLen - bLen) / max < threshold) return false;

  let shared = 0;
  for (const [ch, n] of aCounts) {
    const m = bCounts.get(ch);
    if (m) shared += Math.min(n, m);
  }
  return shared / max >= threshold;
}

export function detectDuplicates(orgs: OrganizationQuality[], raw: QualityInput[]): void {
  const quality = new Map(orgs.map((o) => [o.id, o]));

  const link = (a: string, b: string, reason: string) => {
    const qa = quality.get(a);
    const qb = quality.get(b);
    if (!qa || !qb) return;
    if (!qa.duplicateOf.some((d) => d.id === b)) {
      qa.duplicateOf.push({ id: b, name: qb.name, reason });
      if (!qa.flags.includes("POSSIBLE_DUPLICATE")) qa.flags.push("POSSIBLE_DUPLICATE");
    }
    if (!qb.duplicateOf.some((d) => d.id === a)) {
      qb.duplicateOf.push({ id: a, name: qa.name, reason });
      if (!qb.flags.includes("POSSIBLE_DUPLICATE")) qb.flags.push("POSSIBLE_DUPLICATE");
    }
  };

  // Eindeutige Merkmale: gleiche Website oder gleiche Kontaktadresse.
  // Gruppieren über eine Map, damit der Aufwand linear bleibt.
  const groupBy = (keyOf: (o: QualityInput) => string | null, reason: string) => {
    const groups = new Map<string, string[]>();
    for (const o of raw) {
      const key = keyOf(o);
      if (!key) continue;
      const list = groups.get(key) ?? [];
      list.push(o.id);
      groups.set(key, list);
    }
    for (const ids of groups.values()) {
      if (ids.length < 2) continue;
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) link(ids[i], ids[j], reason);
      }
    }
  };

  groupBy((o) => (filled(o.website) ? normaliseUrl(o.website!) || null : null), "identische Website");
  groupBy(
    (o) => (filled(o.contactEmail) ? o.contactEmail!.trim().toLowerCase() : null),
    "identische E-Mail",
  );

  // Namensähnlichkeit.
  //
  // Verglichen wird nur innerhalb von Kanton, Typ und Ort. Das ist zugleich
  // die inhaltlich richtige Eingrenzung und die entscheidende Bremse für den
  // Aufwand: Zwei Einträge derselben Einrichtung tragen denselben Ort, während
  // gleichnamige Vereine in verschiedenen Dörfern gerade keine Dubletten sind.
  // Ohne diese Aufteilung müsste jede Organisation mit jeder verglichen werden
  // und die Seite würde bei einigen tausend Profilen spürbar langsam.
  //
  // Verschieden geschriebene Orte fallen dadurch aus dem Namensvergleich –
  // solche Fälle deckt die Prüfung auf identische Website oder E-Mail ab.
  type Prepared = { id: string; name: string; len: number; counts: Map<string, number> };

  const buckets = new Map<string, Prepared[]>();
  for (const o of raw) {
    const name = normaliseName(o.name);
    if (!name) continue;
    // Eine Fasnacht und eine Gugge dürfen denselben Namen tragen.
    const key = `${o.canton.code}:${o.type}:${o.city.trim().toLowerCase()}`;
    const list = buckets.get(key) ?? [];
    list.push({ id: o.id, name, len: name.length, counts: charCounts(name) });
    buckets.set(key, list);
  }

  for (const list of buckets.values()) {
    if (list.length < 2) continue;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (!canReach(a.len, b.len, a.counts, b.counts, NAME_SIMILARITY_SAME_CITY)) continue;
        if (similarity(a.name, b.name) >= NAME_SIMILARITY_SAME_CITY) {
          link(a.id, b.id, "sehr ähnlicher Name am selben Ort");
        }
      }
    }
  }
}

export type QualitySummary = {
  total: number;
  good: number;
  incomplete: number;
  averageScore: number;
  withoutLogo: number;
  withoutHeader: number;
  withoutWebsite: number;
  withoutContact: number;
  withoutDescription: number;
  withoutSocial: number;
  carnivalsWithoutUpcoming: number;
  staleVerification: number;
  possibleDuplicates: number;
};

export function summarise(orgs: OrganizationQuality[]): QualitySummary {
  const missing = (o: OrganizationQuality, key: QualityCriterionKey) =>
    o.missing.some((m) => m.key === key);

  return {
    total: orgs.length,
    good: orgs.filter((o) => o.score >= QUALITY_GOOD).length,
    incomplete: orgs.filter((o) => o.score < QUALITY_INCOMPLETE).length,
    averageScore: orgs.length
      ? Math.round(orgs.reduce((s, o) => s + o.score, 0) / orgs.length)
      : 0,
    withoutLogo: orgs.filter((o) => missing(o, "logo")).length,
    withoutHeader: orgs.filter((o) => missing(o, "header")).length,
    withoutWebsite: orgs.filter((o) => missing(o, "website")).length,
    withoutContact: orgs.filter((o) => missing(o, "contact")).length,
    withoutDescription: orgs.filter((o) => missing(o, "description")).length,
    withoutSocial: orgs.filter((o) => missing(o, "social")).length,
    carnivalsWithoutUpcoming: orgs.filter((o) => o.type === "CARNIVAL" && missing(o, "schedule"))
      .length,
    staleVerification: orgs.filter(
      (o) => o.flags.includes("STALE_VERIFICATION") || o.flags.includes("NEVER_VERIFIED"),
    ).length,
    possibleDuplicates: orgs.filter((o) => o.flags.includes("POSSIBLE_DUPLICATE")).length,
  };
}

export type QualitySort =
  | "score-asc"
  | "score-desc"
  | "checked-desc"
  | "checked-asc"
  | "name-asc";

export const QUALITY_SORT_LABELS: Record<QualitySort, string> = {
  "score-asc": "Schlechteste Datenqualität zuerst",
  "score-desc": "Beste Datenqualität zuerst",
  "checked-desc": "Zuletzt geprüft",
  "checked-asc": "Am längsten nicht geprüft",
  "name-asc": "Alphabetisch",
};

export function sortQuality(orgs: OrganizationQuality[], sort: QualitySort): OrganizationQuality[] {
  const time = (d: Date | null) => (d ? d.getTime() : 0);
  const byName = (a: OrganizationQuality, b: OrganizationQuality) =>
    a.name.localeCompare(b.name, "de-CH");

  return [...orgs].sort((a, b) => {
    switch (sort) {
      case "score-desc":
        return b.score - a.score || byName(a, b);
      case "checked-desc":
        return time(b.lastVerifiedAt) - time(a.lastVerifiedAt) || byName(a, b);
      case "checked-asc":
        return time(a.lastVerifiedAt) - time(b.lastVerifiedAt) || byName(a, b);
      case "name-asc":
        return byName(a, b);
      case "score-asc":
      default:
        return a.score - b.score || byName(a, b);
    }
  });
}

export type QualityIssueFilter =
  | "logo"
  | "header"
  | "website"
  | "contact"
  | "description"
  | "schedule"
  | "stale"
  | "duplicate";

export const QUALITY_ISSUE_LABELS: Record<QualityIssueFilter, string> = {
  logo: "Ohne Logo",
  header: "Ohne Titelbild",
  website: "Ohne Website",
  contact: "Ohne Kontakt",
  description: "Ohne Beschreibung",
  schedule: "Ohne kommende Ausgabe",
  stale: "Lange nicht überprüft",
  duplicate: "Mögliche Dublette",
};

export function matchesIssue(org: OrganizationQuality, issue: QualityIssueFilter): boolean {
  switch (issue) {
    case "stale":
      return org.flags.includes("STALE_VERIFICATION") || org.flags.includes("NEVER_VERIFIED");
    case "duplicate":
      return org.flags.includes("POSSIBLE_DUPLICATE");
    default:
      return org.missing.some((m) => m.key === issue);
  }
}

/** Grobe Einordnung für Filter und Farbgebung. */
export function qualityBand(score: number): "good" | "medium" | "poor" {
  if (score >= QUALITY_GOOD) return "good";
  if (score >= QUALITY_INCOMPLETE) return "medium";
  return "poor";
}
