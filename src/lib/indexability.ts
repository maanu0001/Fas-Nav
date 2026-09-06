import type { Prisma } from "@prisma/client";

/**
 * Eine Quelle dafür, welche Inhalte in den Suchindex gehören.
 *
 * Zwei Fragen werden getrennt beantwortet:
 *
 * - Ist die Seite öffentlich? Das entscheidet der Veröffentlichungsstatus und
 *   bestimmt, ob es die Seite überhaupt gibt.
 * - Lohnt sich die Indexierung? Das entscheidet der Inhalt. Eine öffentliche
 *   Seite mit einer Zeile Text ist für Besucher aus der Suche wertlos und
 *   schadet der Domain mehr, als sie nützt.
 *
 * Seite, Sitemap und Tests fragen dieselbe Funktion. Ohne das läuft beides
 * früher oder später auseinander: ein Profil auf noindex, das trotzdem in der
 * Sitemap steht, oder umgekehrt.
 *
 * Ausdrücklich nicht massgeblich ist der Übernahmestatus. Ein importiertes,
 * noch nicht beanspruchtes Profil ist für Suchende genauso nützlich wie ein
 * beanspruchtes, solange es genug Substanz hat.
 */

/** Mindestpunktzahl, ab der ein Profil in den Index gehört. */
export const MIN_INDEX_SCORE = 3;

export type IndexableOrganizationInput = {
  status: string;
  name: string;
  city: string | null;
  shortDescription: string | null;
  description: string | null;
  website: string | null;
  logoId?: string | null;
  headerId?: string | null;
  _count?: { events?: number; socialLinks?: number; media?: number };
};

/**
 * Inhaltliche Substanz eines Profils.
 *
 * Bewusst grob und nachvollziehbar statt fein austariert: Es geht nicht um
 * eine Rangfolge, sondern um die Trennlinie zwischen „hat etwas zu sagen“ und
 * „ist eine leere Hülle“. Name und Ort allein genügen nicht – die hat jeder
 * importierte Datensatz.
 */
export function organizationContentScore(org: IndexableOrganizationInput): number {
  let punkte = 0;

  // Eine echte Beschreibung ist das stärkste Einzelmerkmal.
  const beschreibung = (org.shortDescription ?? org.description ?? "").trim();
  if (beschreibung.length >= 120) punkte += 2;
  else if (beschreibung.length >= 40) punkte += 1;

  if (org.website) punkte += 1;
  if (org.logoId || org.headerId) punkte += 1;
  if ((org._count?.events ?? 0) > 0) punkte += 2;
  if ((org._count?.socialLinks ?? 0) > 0) punkte += 1;
  if ((org._count?.media ?? 0) > 0) punkte += 1;

  return punkte;
}

/** Existiert die Seite öffentlich? */
export function isPublicOrganization(org: { status: string }): boolean {
  return org.status === "PUBLISHED";
}

/**
 * Gehört das Profil in den Suchindex?
 *
 * Ein nicht indexierbares Profil bleibt öffentlich erreichbar und intern
 * verlinkt – es trägt lediglich `noindex` und fehlt in der Sitemap. Sobald die
 * Organisation ihr Profil ausbaut, kippt die Entscheidung von allein.
 */
export function isIndexableOrganization(org: IndexableOrganizationInput): boolean {
  if (!isPublicOrganization(org)) return false;
  if (!org.name?.trim() || !org.city?.trim()) return false;
  return organizationContentScore(org) >= MIN_INDEX_SCORE;
}

/** Felder, die für die Bewertung geladen werden müssen. */
export const INDEXABILITY_SELECT = {
  status: true,
  name: true,
  city: true,
  shortDescription: true,
  description: true,
  website: true,
  logoId: true,
  headerId: true,
  _count: { select: { events: true, socialLinks: true, media: true } },
} satisfies Prisma.OrganizationSelect;

/**
 * Eine Veranstaltung ist indexierbar, sobald sie veröffentlicht ist und zu
 * einer veröffentlichten Organisation gehört.
 *
 * Anders als bei Profilen gibt es hier keine Substanzschwelle: Ein Termin mit
 * Datum und Ort beantwortet bereits eine vollständige Suchanfrage.
 */
export function isIndexableEvent(event: {
  status: string;
  organization: { status: string };
}): boolean {
  return event.status === "PUBLISHED" && event.organization.status === "PUBLISHED";
}

/** Where-Bedingung für alle indexierbaren Veranstaltungen. */
export const indexableEventWhere: Prisma.EventWhereInput = {
  status: "PUBLISHED",
  organization: { status: "PUBLISHED" },
};
