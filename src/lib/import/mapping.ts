import type { OrganizationType, Prisma, SocialPlatform } from "@prisma/client";

import { slugify } from "@/lib/utils";
import type { ImportOrganization } from "@/lib/import/schema";

/**
 * Übersetzt einen Recherchedatensatz in Felder des bestehenden
 * Organisationsmodells. Es entsteht bewusst kein zweites Datenmodell:
 * Fasnachten und Guggen sind weiterhin dieselbe Entität, unterschieden
 * über `type`.
 */

/** GUGGEN aus der Recherche entspricht GUGGE im Datenmodell. */
export function mapOrganizationType(value: string): OrganizationType {
  return value === "CARNIVAL" || value === "FASNACHT" ? "CARNIVAL" : "GUGGE";
}

/** Felder, die ein Import setzen darf. Alles andere bleibt unberührt. */
export type MappedFields = {
  name: string;
  shortName: string | null;
  alternativeNames: string[];
  motto: string | null;
  shortDescription: string | null;
  description: string | null;
  catchmentArea: string | null;
  associationType: string | null;
  specialFeatures: string[];
  city: string;
  zip: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  bookingEmail: string | null;
  foundedYear: number | null;
  memberCount: number | null;
  musicStyle: string | null;
  performanceArea: string | null;
  homeCarnival: string | null;
  instrumentation: string | null;
  knownAppearances: string[];
  bookingInfo: string | null;
  startDate: Date | null;
  endDate: Date | null;
  typicalPeriod: string | null;
  recurrence: string | null;
  organizerName: string | null;
  programHighlights: string[];
  hasParade: boolean | null;
  hasChildrensCarnival: boolean | null;
  hasMaskedBall: boolean | null;
  hasMonsterConcert: boolean | null;
  hasSchnitzelbank: boolean | null;
  hasBeizenfasnacht: boolean | null;
  logoSourceUrl: string | null;
  logoAssetUrl: string | null;
  logoStatus: string | null;
  headerSourceUrl: string | null;
  headerAssetUrl: string | null;
  headerStatus: string | null;
};

/** Reihenfolge bestimmt die Anzeige im Konfliktdialog. */
export const MAPPED_FIELD_KEYS = [
  "name",
  "shortName",
  "alternativeNames",
  "motto",
  "shortDescription",
  "description",
  "catchmentArea",
  "associationType",
  "specialFeatures",
  "city",
  "zip",
  "contactName",
  "contactEmail",
  "contactPhone",
  "website",
  "bookingEmail",
  "foundedYear",
  "memberCount",
  "musicStyle",
  "performanceArea",
  "homeCarnival",
  "instrumentation",
  "knownAppearances",
  "bookingInfo",
  "startDate",
  "endDate",
  "typicalPeriod",
  "recurrence",
  "organizerName",
  "programHighlights",
  "hasParade",
  "hasChildrensCarnival",
  "hasMaskedBall",
  "hasMonsterConcert",
  "hasSchnitzelbank",
  "hasBeizenfasnacht",
  "logoSourceUrl",
  "logoAssetUrl",
  "logoStatus",
  "headerSourceUrl",
  "headerAssetUrl",
  "headerStatus",
] as const satisfies readonly (keyof MappedFields)[];

/** Beschriftungen für die Anzeige von Konflikten im Adminbereich. */
export const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  shortName: "Kurzname",
  alternativeNames: "Weitere Namen",
  motto: "Motto",
  shortDescription: "Kurzbeschreibung",
  description: "Beschreibung",
  catchmentArea: "Einzugsgebiet",
  associationType: "Vereinsform",
  specialFeatures: "Besonderheiten",
  city: "Ort",
  zip: "PLZ",
  contactName: "Ansprechperson",
  contactEmail: "E-Mail",
  contactPhone: "Telefon",
  website: "Website",
  bookingEmail: "Buchungs-E-Mail",
  foundedYear: "Gründungsjahr",
  memberCount: "Mitgliederzahl",
  musicStyle: "Musikstil",
  performanceArea: "Einsatzgebiet",
  homeCarnival: "Stammfasnacht",
  instrumentation: "Besetzung",
  knownAppearances: "Bekannte Auftritte",
  bookingInfo: "Buchungshinweise",
  startDate: "Beginn",
  endDate: "Ende",
  typicalPeriod: "Üblicher Zeitraum",
  recurrence: "Rhythmus",
  organizerName: "Veranstalter",
  programHighlights: "Programmhöhepunkte",
  hasParade: "Umzug",
  hasChildrensCarnival: "Kinderfasnacht",
  hasMaskedBall: "Maskenball",
  hasMonsterConcert: "Monsterkonzert",
  hasSchnitzelbank: "Schnitzelbank",
  hasBeizenfasnacht: "Beizenfasnacht",
  logoSourceUrl: "Logo-Quelle",
  logoAssetUrl: "Logo-Datei",
  logoStatus: "Logo-Status",
  headerSourceUrl: "Titelbild-Quelle",
  headerAssetUrl: "Titelbild-Datei",
  headerStatus: "Titelbild-Status",
};

/**
 * Bildet einen Recherchedatensatz auf Modellfelder ab.
 *
 * Fasnacht- und Guggen-Blöcke werden zusammengeführt: Angaben aus dem
 * typspezifischen Block haben Vorrang vor den allgemeinen Angaben.
 */
export function mapOrganization(input: ImportOrganization): MappedFields {
  const type = mapOrganizationType(input.organizationType);
  const carnival = input.carnival ?? {};
  const guggen = input.guggen ?? {};
  const general = input.general ?? {};
  const logo = (input.logo ?? {}) as Record<string, string | null>;
  const header = (input.headerImage ?? {}) as Record<string, string | null>;

  const nextEdition = carnival.nextEdition ?? null;

  return {
    name: input.name,
    shortName: input.shortName ?? null,
    alternativeNames: input.alternativeNames,
    motto: general.motto ?? null,
    shortDescription: general.shortDescription ?? null,
    description: general.description ?? null,
    catchmentArea: general.catchmentArea ?? null,
    associationType: general.associationType ?? null,
    specialFeatures: general.specialFeatures ?? [],

    city: input.location.locality ?? input.location.cantonName ?? "Unbekannt",
    zip: input.location.postalCode ?? null,

    contactName: input.contact.contactPerson ?? null,
    contactEmail: input.contact.email ?? null,
    contactPhone: input.contact.phone ?? null,
    website: input.contact.website ?? null,
    bookingEmail: input.contact.bookingEmail ?? null,

    // Typspezifische Angaben haben Vorrang vor den allgemeinen.
    foundedYear: guggen.foundedYear ?? general.foundedYear ?? null,
    memberCount: guggen.memberCount ?? general.memberCount ?? null,
    musicStyle: guggen.musicalDirection ?? general.musicalStyle ?? null,

    performanceArea: guggen.performanceArea ?? null,
    homeCarnival: guggen.homeCarnival ?? null,
    instrumentation: guggen.instrumentation ?? null,
    knownAppearances: guggen.knownAppearances ?? [],
    bookingInfo: guggen.bookingInfo ?? null,

    // Der Zeitraum einer Fasnacht ergibt sich aus der nächsten Ausgabe.
    startDate: type === "CARNIVAL" ? (nextEdition?.startDate ?? null) : null,
    endDate: type === "CARNIVAL" ? (nextEdition?.endDate ?? null) : null,
    typicalPeriod: carnival.typicalPeriod ?? null,
    recurrence: carnival.recurrence ?? null,
    organizerName: carnival.organizer ?? null,
    programHighlights: carnival.programHighlights ?? [],
    hasParade: carnival.hasParade ?? null,
    hasChildrensCarnival: carnival.hasChildrensCarnival ?? null,
    hasMaskedBall: carnival.hasMaskedBall ?? null,
    hasMonsterConcert: carnival.hasMonsterConcert ?? null,
    hasSchnitzelbank: carnival.hasSchnitzelbank ?? null,
    hasBeizenfasnacht: carnival.hasBeizenfasnacht ?? null,

    logoSourceUrl: logo.logoSourceUrl ?? null,
    logoAssetUrl: logo.logoAssetUrl ?? null,
    logoStatus: logo.logoStatus ?? null,
    headerSourceUrl: header.headerSourceUrl ?? null,
    headerAssetUrl: header.headerAssetUrl ?? null,
    headerStatus: header.headerStatus ?? null,
  };
}

/** Social-Media-Felder der Recherche auf die Plattform-Enums abbilden. */
export function mapSocialLinks(
  input: ImportOrganization,
): { platform: SocialPlatform; url: string }[] {
  const social = input.socialMedia ?? {};
  const mapping: [string | null | undefined, SocialPlatform][] = [
    [social.facebook, "FACEBOOK"],
    [social.instagram, "INSTAGRAM"],
    [social.tiktok, "TIKTOK"],
    [social.youtube, "YOUTUBE"],
    [social.x ?? social.twitter, "X"],
    [social.linkedin, "LINKEDIN"],
    [social.spotify, "SPOTIFY"],
    [social.whatsapp, "WHATSAPP"],
    [social.other, "OTHER"],
  ];

  // Leere Links werden nicht gespeichert.
  return mapping
    .filter((entry): entry is [string, SocialPlatform] => Boolean(entry[0]))
    .map(([url, platform]) => ({ platform, url }));
}

/** Schlägt einen Slug vor – aus der Datei oder aus Name und Ort. */
export function proposeSlug(input: ImportOrganization): string {
  if (input.slug) {
    const cleaned = slugify(input.slug);
    if (cleaned.length >= 3) return cleaned;
  }
  const base = slugify(input.name);
  if (base.length >= 3) return base;
  return slugify(`${input.name} ${input.location.locality ?? ""}`) || "organisation";
}

/** Entfernt Felder ohne Wert, damit ein Import nichts leert. */
export function withoutEmptyValues(
  fields: Partial<MappedFields>,
): Partial<MappedFields> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    result[key] = value;
  }
  return result as Partial<MappedFields>;
}

/** Vergleicht zwei Feldwerte inhaltlich. */
export function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || a === undefined) return b === null || b === undefined;
  if (b === null || b === undefined) return false;
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (a instanceof Date || b instanceof Date) {
    const da = a instanceof Date ? a : new Date(String(a));
    const db = b instanceof Date ? b : new Date(String(b));
    return da.getTime() === db.getTime();
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => item === b[i]);
  }
  return false;
}

export type OrganizationWriteData = Prisma.OrganizationUncheckedUpdateInput;
