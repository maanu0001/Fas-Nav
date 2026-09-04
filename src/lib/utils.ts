import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Erzeugt einen URL-tauglichen Slug inklusive korrekter Umlautbehandlung. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/à|á|â|ã|å/g, "a")
    .replace(/è|é|ê|ë/g, "e")
    .replace(/ì|í|î|ï/g, "i")
    .replace(/ò|ó|ô|õ/g, "o")
    .replace(/ù|ú|û/g, "u")
    .replace(/ç/g, "c")
    .replace(/ñ/g, "n")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

/** Formatiert CHF-Beträge im Schweizer Format (1'234.50). */
export function formatChf(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "–";
  const num = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(num)) return "–";
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: "CHF",
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
  }).format(num);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function truncate(text: string, length = 160): string {
  if (text.length <= length) return text;
  return `${text.slice(0, length - 1).trimEnd()}…`;
}

/** Entfernt HTML-Tags aus Freitext (Defense-in-Depth gegen XSS). */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "");
}

export function absoluteUrl(path = "/"): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "https://fas-nav.ch").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
