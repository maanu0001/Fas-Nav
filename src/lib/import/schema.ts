import { z } from "zod";

import { CANTONS } from "@/lib/constants";

/**
 * Struktur der Recherchedatei.
 *
 * Grundhaltung: streng bei allem, was die Datenqualität betrifft, tolerant
 * gegenüber zusätzlichen oder künftigen Feldern. Unbekannte Felder führen
 * nicht zum Abbruch, damit spätere Versionen derselben Datei weiterhin
 * importierbar bleiben.
 */

const CANTON_CODES = CANTONS.map((c) => c.code);

/** Leerstrings werden zu null – die Recherche liefert beides. */
const nullableText = (max: number) =>
  z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((v) => {
      if (v === null || v === undefined) return null;
      const text = String(v).trim();
      return text.length ? text.slice(0, max) : null;
    });

const textList = (max: number, maxItems = 50) =>
  z
    .union([z.array(z.union([z.string(), z.number()])), z.null()])
    .optional()
    .transform((v) => {
      if (!Array.isArray(v)) return [];
      return v
        .map((item) => String(item).trim())
        .filter((item) => item.length > 0)
        .map((item) => item.slice(0, max))
        .slice(0, maxItems);
    });

const nullableBool = z
  .union([z.boolean(), z.null()])
  .optional()
  .transform((v) => (typeof v === "boolean" ? v : null));

const nullableInt = (min: number, max: number) =>
  z
    .union([z.number(), z.string(), z.null()])
    .optional()
    .transform((v, ctx) => {
      if (v === null || v === undefined || v === "") return null;
      const num = typeof v === "number" ? v : Number(v);
      if (!Number.isFinite(num) || !Number.isInteger(num)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Keine ganze Zahl." });
        return z.NEVER;
      }
      if (num < min || num > max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Wert muss zwischen ${min} und ${max} liegen.`,
        });
        return z.NEVER;
      }
      return num;
    });

/** Akzeptiert nur http/https – schützt vor javascript:-URLs. */
const nullableUrl = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v, ctx) => {
    if (v === null || v === undefined) return null;
    const raw = String(v).trim();
    if (!raw) return null;
    const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      const url = new URL(candidate);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Nur http/https erlaubt." });
        return z.NEVER;
      }
      return url.toString().slice(0, 500);
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Ungültige URL: ${raw}` });
      return z.NEVER;
    }
  });

const nullableEmail = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v, ctx) => {
    if (v === null || v === undefined) return null;
    const raw = String(v).trim().toLowerCase();
    if (!raw) return null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Ungültige E-Mail: ${raw}` });
      return z.NEVER;
    }
    return raw.slice(0, 200);
  });

/** ISO-Datum (YYYY-MM-DD) oder vollständiger Zeitstempel. */
const nullableDate = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v, ctx) => {
    if (v === null || v === undefined) return null;
    const raw = String(v).trim();
    if (!raw) return null;
    if (!/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(raw)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Ungültiges Datumsformat: ${raw} (erwartet JJJJ-MM-TT).`,
      });
      return z.NEVER;
    }
    const date = new Date(raw.length === 10 ? `${raw}T00:00:00.000Z` : raw);
    if (Number.isNaN(date.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Ungültiges Datum: ${raw}` });
      return z.NEVER;
    }
    return date;
  });

export const importOrganizationTypeSchema = z
  .string()
  .transform((v) => v.trim().toUpperCase())
  .pipe(
    // Die Recherche verwendet GUGGEN, das Datenmodell GUGGE.
    z.enum(["CARNIVAL", "GUGGEN", "GUGGE", "FASNACHT"]),
  );

export const activityStatusSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (!v) return null;
    const value = String(v).trim().toUpperCase().replace(/[\s-]+/g, "_");
    const allowed = ["ACTIVE", "LIKELY_ACTIVE", "UNCERTAIN", "INACTIVE", "UNKNOWN"];
    return allowed.includes(value) ? (value as (typeof allowed)[number]) : "UNKNOWN";
  });

const locationSchema = z.object({
  locality: nullableText(120),
  postalCode: nullableText(10),
  canton: z
    .string()
    .transform((v) => v.trim().toUpperCase())
    .refine((v) => CANTON_CODES.includes(v as (typeof CANTON_CODES)[number]), {
      message: "Unbekannter Kantonscode.",
    }),
  cantonName: nullableText(80),
  region: nullableText(80),
  country: nullableText(4),
  additionalLocalities: textList(120),
});

const generalSchema = z
  .object({
    foundedYear: nullableInt(1000, 2200),
    memberCount: nullableInt(0, 100000),
    motto: nullableText(300),
    shortDescription: nullableText(600),
    description: nullableText(20000),
    colors: nullableText(200),
    catchmentArea: nullableText(300),
    associationType: nullableText(160),
    musicalStyle: nullableText(200),
    specialFeatures: textList(300),
  })
  .partial()
  .default({});

const nextEditionSchema = z
  .object({
    year: nullableInt(1900, 2200),
    startDate: nullableDate,
    endDate: nullableDate,
    sourceUrl: nullableUrl,
    note: nullableText(500),
  })
  .partial()
  .nullable()
  .optional();

const carnivalSchema = z
  .object({
    typicalPeriod: nullableText(200),
    nextEdition: nextEditionSchema,
    hasParade: nullableBool,
    hasChildrensCarnival: nullableBool,
    hasMaskedBall: nullableBool,
    hasMonsterConcert: nullableBool,
    hasSchnitzelbank: nullableBool,
    hasBeizenfasnacht: nullableBool,
    programHighlights: textList(300),
    organizer: nullableText(200),
    recurrence: nullableText(120),
  })
  .partial()
  .nullable()
  .optional();

const guggenSchema = z
  .object({
    foundedYear: nullableInt(1000, 2200),
    memberCount: nullableInt(0, 100000),
    musicalDirection: nullableText(200),
    performanceArea: nullableText(300),
    homeCarnival: nullableText(200),
    instrumentation: nullableText(2000),
    knownAppearances: textList(300),
    bookingInfo: nullableText(2000),
  })
  .partial()
  .nullable()
  .optional();

const contactSchema = z
  .object({
    website: nullableUrl,
    email: nullableEmail,
    phone: nullableText(40),
    contactPerson: nullableText(160),
    bookingEmail: nullableEmail,
    address: nullableText(300),
  })
  .partial()
  .default({});

const socialMediaSchema = z
  .object({
    instagram: nullableUrl,
    facebook: nullableUrl,
    tiktok: nullableUrl,
    youtube: nullableUrl,
    x: nullableUrl,
    twitter: nullableUrl,
    linkedin: nullableUrl,
    spotify: nullableUrl,
    whatsapp: nullableUrl,
    other: nullableUrl,
  })
  .partial()
  .default({});

const assetSchema = (prefix: "logo" | "header") =>
  z
    .object({
      [`${prefix}SourceUrl`]: nullableUrl,
      [`${prefix}AssetUrl`]: nullableUrl,
      [`${prefix}Status`]: nullableText(60),
    })
    .partial()
    .nullable()
    .optional();

const sourceSchema = z.object({
  url: nullableUrl,
  type: nullableText(60),
  title: nullableText(300),
  accessedAt: nullableDate,
});

const activitySchema = z
  .object({
    activityStatus: activityStatusSchema,
    lastActivityEvidence: nullableText(2000),
    lastVerifiedAt: nullableDate,
  })
  .partial()
  .default({});

export const importOrganizationSchema = z.object({
  importId: z
    .string()
    .trim()
    .min(3, "importId ist erforderlich.")
    .max(120)
    .regex(/^[A-Za-z0-9_.:-]+$/, "importId enthält unzulässige Zeichen."),
  slug: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (v ? String(v).trim().toLowerCase() : null)),
  name: z.string().trim().min(2, "name ist erforderlich.").max(140),
  shortName: nullableText(60),
  alternativeNames: textList(140),
  organizationType: importOrganizationTypeSchema,
  location: locationSchema,
  general: generalSchema,
  carnival: carnivalSchema,
  guggen: guggenSchema,
  contact: contactSchema,
  socialMedia: socialMediaSchema,
  logo: assetSchema("logo"),
  headerImage: assetSchema("header"),
  activity: activitySchema,
  sources: z.union([z.array(sourceSchema), z.null()]).optional().transform((v) => v ?? []),
  confidenceScore: z
    .union([z.number(), z.string(), z.null()])
    .optional()
    .transform((v, ctx) => {
      if (v === null || v === undefined || v === "") return null;
      const num = typeof v === "number" ? v : Number(v);
      if (!Number.isFinite(num) || num < 0 || num > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "confidenceScore muss zwischen 0 und 100 liegen.",
        });
        return z.NEVER;
      }
      return Math.round(num);
    }),
  needsManualReview: z
    .union([z.boolean(), z.null()])
    .optional()
    .transform((v) => v === true),
  reviewReasons: textList(300),
  dataNotes: nullableText(4000),
});

export type ImportOrganization = z.infer<typeof importOrganizationSchema>;

export const importMetadataSchema = z
  .object({
    generatedAt: nullableText(60),
    country: nullableText(4),
    version: nullableText(20),
    purpose: nullableText(200),
    researchRound: nullableText(120),
    totalOrganizations: nullableInt(0, 1000000),
    totalCarnivals: nullableInt(0, 1000000),
    totalGuggen: nullableInt(0, 1000000),
    byCanton: z.record(z.string(), z.number()).nullable().optional(),
  })
  .partial()
  .default({});

export const importFileSchema = z.object({
  metadata: importMetadataSchema,
  organizations: z
    .array(z.unknown())
    .min(1, "Die Datei enthält keine Organisationen."),
});

export type ImportMetadata = z.infer<typeof importMetadataSchema>;
