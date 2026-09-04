import type { OrganizationType } from "@prisma/client";

import { slugify } from "@/lib/utils";

/**
 * Dublettenerkennung zwischen Recherchedatei und Bestand.
 *
 * Es wird streng zwischen zwei Ergebnissen unterschieden:
 *  - EXACT:    eindeutiger Treffer → Aktualisierung ist zulässig.
 *  - POSSIBLE: möglicher Treffer → wird niemals automatisch zusammengeführt,
 *              sondern dem Admin zur Entscheidung vorgelegt.
 */

export type MatchKind = "EXACT" | "POSSIBLE";

export type MatchReason =
  | "importId"
  | "slug"
  | "website"
  | "nameAndCity"
  | "alternativeName"
  | "socialMedia"
  | "similarNameAndCity";

export type DuplicateMatch = {
  organizationId: string;
  kind: MatchKind;
  reason: MatchReason;
  /** 0–1, nur bei Namensähnlichkeit aussagekräftig. */
  similarity: number;
  label: string;
};

/** Schlanke Sicht auf den Bestand, die vollständig in den Speicher passt. */
export type ExistingOrganization = {
  id: string;
  name: string;
  slug: string;
  type: OrganizationType;
  city: string;
  cantonCode: string;
  website: string | null;
  externalImportId: string | null;
  alternativeNames: string[];
  socialUrls: string[];
};

export type DuplicateIndex = {
  byImportId: Map<string, ExistingOrganization>;
  bySlug: Map<string, ExistingOrganization>;
  byWebsite: Map<string, ExistingOrganization>;
  bySocial: Map<string, ExistingOrganization>;
  byNameCity: Map<string, ExistingOrganization>;
  byAlternativeName: Map<string, ExistingOrganization>;
  all: ExistingOrganization[];
};

/** Vergleichsform eines Namens: klein, ohne Zusätze und Sonderzeichen. */
export function normaliseName(value: string): string {
  return slugify(
    value
      .toLowerCase()
      // Häufige Rechtsform- und Gattungszusätze stören den Vergleich.
      .replace(/\b(verein|vereinigung|gesellschaft|komitee|comite|club|clique)\b/g, " ")
      .replace(/\b(guggenmusik|guggemusig|gugge|gugg|fasnacht|fasnachts|fastnacht|carneval|carnaval)\b/g, " "),
  ).replace(/-/g, "");
}

/** Vergleichsform einer URL: ohne Schema, www und abschliessenden Slash. */
export function normaliseUrl(value: string): string {
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    const path = url.pathname.replace(/\/+$/, "").toLowerCase();
    return `${host}${path}`;
  } catch {
    return value.trim().toLowerCase();
  }
}

function nameCityKey(name: string, city: string): string {
  return `${normaliseName(name)}|${slugify(city)}`;
}

/**
 * Baut die Suchindizes einmalig auf.
 * Vermeidet Einzelabfragen je Datensatz und trägt damit auch bei
 * mehreren tausend Datensätzen.
 */
export function buildDuplicateIndex(existing: ExistingOrganization[]): DuplicateIndex {
  const index: DuplicateIndex = {
    byImportId: new Map(),
    bySlug: new Map(),
    byWebsite: new Map(),
    bySocial: new Map(),
    byNameCity: new Map(),
    byAlternativeName: new Map(),
    all: existing,
  };

  for (const org of existing) {
    if (org.externalImportId) index.byImportId.set(org.externalImportId, org);
    index.bySlug.set(org.slug, org);
    if (org.website) index.byWebsite.set(normaliseUrl(org.website), org);
    for (const url of org.socialUrls) index.bySocial.set(normaliseUrl(url), org);

    const key = nameCityKey(org.name, org.city);
    if (!index.byNameCity.has(key)) index.byNameCity.set(key, org);

    for (const alt of org.alternativeNames) {
      const altKey = nameCityKey(alt, org.city);
      if (!index.byAlternativeName.has(altKey)) index.byAlternativeName.set(altKey, org);
    }
  }

  return index;
}

/** Ähnlichkeit zweier Zeichenketten (Levenshtein, normiert auf 0–1). */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;

  const rows = a.length + 1;
  const cols = b.length + 1;
  let previous = Array.from({ length: cols }, (_, i) => i);

  for (let i = 1; i < rows; i++) {
    const current = [i, ...Array<number>(cols - 1).fill(0)];
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
    }
    previous = current;
  }

  const distance = previous[cols - 1];
  return 1 - distance / Math.max(a.length, b.length);
}

export type DuplicateCandidate = {
  importId: string;
  name: string;
  slug: string;
  type: OrganizationType;
  city: string;
  cantonCode: string;
  website: string | null;
  alternativeNames: string[];
  socialUrls: string[];
};

/**
 * Schwellenwerte der Namensähnlichkeit.
 *
 * Im selben Ort genügt eine geringere Ähnlichkeit, weil der gleiche Ort
 * bereits ein starkes Indiz ist ("Lozärner Fasnacht" ↔ "Luzerner Fasnacht"
 * erreicht 0.78). Über verschiedene Orte hinweg wird deutlich strenger
 * geprüft, damit eigenständige Organisationen nicht fälschlich als Dublette
 * erscheinen.
 */
const SIMILARITY_SAME_CITY = 0.75;
const SIMILARITY_SAME_CANTON = 0.88;

/**
 * Sucht den besten Treffer für einen Importdatensatz.
 * Die Prüfungen laufen von der stärksten zur schwächsten Aussagekraft.
 */
export function findDuplicate(
  candidate: DuplicateCandidate,
  index: DuplicateIndex,
): DuplicateMatch | null {
  // 1. Stabile Importkennung – der verlässlichste Treffer.
  const byImportId = index.byImportId.get(candidate.importId);
  if (byImportId) {
    return match(byImportId, "EXACT", "importId", 1);
  }

  // 2. Identischer Slug.
  const bySlug = index.bySlug.get(candidate.slug);
  if (bySlug) {
    return match(bySlug, "EXACT", "slug", 1);
  }

  // 3. Identische Website.
  if (candidate.website) {
    const byWebsite = index.byWebsite.get(normaliseUrl(candidate.website));
    if (byWebsite) return match(byWebsite, "EXACT", "website", 1);
  }

  // 4. Identischer Name am selben Ort.
  const key = nameCityKey(candidate.name, candidate.city);
  const byNameCity = index.byNameCity.get(key);
  if (byNameCity) return match(byNameCity, "EXACT", "nameAndCity", 1);

  // 5. Treffer über einen weiteren Namen.
  const byAlternative =
    index.byAlternativeName.get(key) ??
    candidate.alternativeNames
      .map((alt) => index.byNameCity.get(nameCityKey(alt, candidate.city)))
      .find(Boolean);
  if (byAlternative) return match(byAlternative, "POSSIBLE", "alternativeName", 0.9);

  // 6. Identischer Social-Media-Auftritt.
  for (const url of candidate.socialUrls) {
    const bySocial = index.bySocial.get(normaliseUrl(url));
    if (bySocial) return match(bySocial, "POSSIBLE", "socialMedia", 0.9);
  }

  // 7. Ähnlicher Name in derselben Region – ausschliesslich als Vorschlag.
  const normalisedCandidate = normaliseName(candidate.name);
  const candidateCity = slugify(candidate.city);
  let best: { org: ExistingOrganization; score: number } | null = null;

  for (const org of index.all) {
    if (org.cantonCode !== candidate.cantonCode) continue;
    if (org.type !== candidate.type) continue;

    const sameCity = slugify(org.city) === candidateCity;
    const threshold = sameCity ? SIMILARITY_SAME_CITY : SIMILARITY_SAME_CANTON;

    const score = similarity(normalisedCandidate, normaliseName(org.name));
    if (score >= threshold && (!best || score > best.score)) {
      best = { org, score };
    }
  }

  if (best) return match(best.org, "POSSIBLE", "similarNameAndCity", best.score);

  return null;
}

function match(
  org: ExistingOrganization,
  kind: MatchKind,
  reason: MatchReason,
  similarityScore: number,
): DuplicateMatch {
  return {
    organizationId: org.id,
    kind,
    reason,
    similarity: similarityScore,
    label: `${org.name} (${org.city})`,
  };
}

export const MATCH_REASON_LABELS: Record<MatchReason, string> = {
  importId: "Gleiche Import-Kennung",
  slug: "Gleiche Adresse (Slug)",
  website: "Gleiche Website",
  nameAndCity: "Gleicher Name und Ort",
  alternativeName: "Treffer über weiteren Namen",
  socialMedia: "Gleicher Social-Media-Auftritt",
  similarNameAndCity: "Ähnlicher Name im selben Kanton",
};
