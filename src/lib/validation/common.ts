import { z } from "zod";

import { stripHtml } from "@/lib/utils";

/** Trimmt und entfernt HTML – Basis für alle Freitextfelder. */
export const safeText = (max: number) =>
  z
    .string()
    .transform((v) => stripHtml(v).trim())
    .pipe(z.string().max(max, `Maximal ${max} Zeichen erlaubt.`));

export const requiredText = (max: number, label = "Dieses Feld") =>
  safeText(max).pipe(z.string().min(1, `${label} ist erforderlich.`));

export const optionalText = (max: number) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => {
      if (v === null || v === undefined) return null;
      const cleaned = stripHtml(v).trim();
      return cleaned.length ? cleaned : null;
    })
    .pipe(z.string().max(max, `Maximal ${max} Zeichen erlaubt.`).nullable());

/** Erlaubt ausschliesslich http/https – verhindert javascript:-URLs (XSS). */
export const httpUrl = z
  .string()
  .trim()
  .max(500)
  .refine(
    (v) => {
      try {
        const url = new URL(v);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Bitte eine gültige URL mit http:// oder https:// angeben." },
  );

export const optionalUrl = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (v === null || v === undefined || v.trim() === "" ? null : v.trim()))
  .pipe(httpUrl.nullable());

export const email = z
  .string()
  .trim()
  .toLowerCase()
  .email("Bitte eine gültige E-Mail-Adresse angeben.")
  .max(200);

export const optionalEmail = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (v === null || v === undefined || v.trim() === "" ? null : v.trim().toLowerCase()))
  .pipe(z.string().email("Bitte eine gültige E-Mail-Adresse angeben.").max(200).nullable());

export const optionalPhone = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (v === null || v === undefined || v.trim() === "" ? null : v.trim()))
  .pipe(
    z
      .string()
      .max(40)
      .regex(/^[+0-9 ()/.-]{6,40}$/, "Bitte eine gültige Telefonnummer angeben.")
      .nullable(),
  );

export const slug = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Der Slug muss mindestens 3 Zeichen lang sein.")
  .max(90)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Nur Kleinbuchstaben, Zahlen und Bindestriche sind erlaubt.",
  );

/** Akzeptiert ISO-Strings und Date-Objekte. */
export const dateInput = z
  .union([z.string(), z.date()])
  .transform((v, ctx) => {
    const date = v instanceof Date ? v : new Date(v);
    if (Number.isNaN(date.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Ungültiges Datum." });
      return z.NEVER;
    }
    return date;
  });

export const optionalDate = z
  .union([z.string(), z.date(), z.null(), z.undefined()])
  .transform((v, ctx) => {
    if (v === null || v === undefined || v === "") return null;
    const date = v instanceof Date ? v : new Date(v);
    if (Number.isNaN(date.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Ungültiges Datum." });
      return z.NEVER;
    }
    return date;
  });

export const cuid = z.string().min(1).max(40);

export const optionalCuid = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (v === null || v === undefined || v === "" ? null : v))
  .pipe(z.string().max(40).nullable());

export const optionalInt = (min: number, max: number) =>
  z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((v, ctx) => {
      if (v === null || v === undefined || v === "") return null;
      const num = typeof v === "number" ? v : Number(v);
      if (Number.isNaN(num) || !Number.isInteger(num)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Bitte eine ganze Zahl angeben." });
        return z.NEVER;
      }
      if (num < min || num > max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Der Wert muss zwischen ${min} und ${max} liegen.`,
        });
        return z.NEVER;
      }
      return num;
    });

export const decimalAmount = z
  .union([z.number(), z.string()])
  .transform((v, ctx) => {
    const num = typeof v === "number" ? v : Number(String(v).replace(/'/g, ""));
    if (Number.isNaN(num) || num < 0 || num > 1_000_000) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Ungültiger Betrag." });
      return z.NEVER;
    }
    return Math.round(num * 100) / 100;
  });

export const optionalDecimal = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((v, ctx) => {
    if (v === null || v === undefined || v === "") return null;
    const num = typeof v === "number" ? v : Number(String(v).replace(/'/g, ""));
    if (Number.isNaN(num) || num < 0 || num > 1_000_000) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Ungültiger Betrag." });
      return z.NEVER;
    }
    return Math.round(num * 100) / 100;
  });

/**
 * Passwortrichtlinie für alle Accounts.
 *
 * Massgeblich ist die Länge. Vorgeschriebene Zeichenklassen führen erfahrungs-
 * gemäss zu vorhersehbaren Passwörtern wie "Passwort1!" und blockierten hier
 * vor allem das Setzen brauchbarer Passwörter durch die Administration, ohne
 * die Sicherheit zu erhöhen. Zwölf Zeichen ohne Zwänge sind widerstandsfähiger
 * als zehn mit Zwängen; gespeichert wird ohnehin nur der bcrypt-Hash.
 */
export const password = z
  .string()
  .min(12, "Das Passwort muss mindestens 12 Zeichen lang sein.")
  .max(200, "Das Passwort ist zu lang.");

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});
