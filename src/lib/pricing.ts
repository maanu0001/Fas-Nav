import { prisma } from "@/lib/prisma";
import type { BillingInterval } from "@prisma/client";

/**
 * Gemeinsame Bausteine der Preisdarstellung.
 *
 * Die öffentliche Preisseite und die Verwaltung im Dashboard lesen dieselben
 * Daten und beschriften sie gleich. Damit heisst ein Abrechnungsintervall
 * nicht an zwei Orten unterschiedlich.
 */

export const BILLING_INTERVAL_LABELS: Record<BillingInterval, string> = {
  YEARLY: "jährlich",
  MONTHLY: "monatlich",
  ONE_TIME: "einmalig",
};

/** Kurzform hinter dem Preis, z. B. „CHF 50 / Jahr“. */
export const BILLING_INTERVAL_SUFFIX: Record<BillingInterval, string> = {
  YEARLY: "/ Jahr",
  MONTHLY: "/ Monat",
  ONE_TIME: "einmalig",
};

/** Standardbeschriftung des Knopfes, wenn der Tarif keine eigene vorgibt. */
export function defaultCtaText(priceChf: number): string {
  return priceChf === 0 ? "Kostenlos starten" : "Jetzt eintragen";
}

/** Standardziel des Knopfes: das Eintragsformular mit vorgewähltem Tarif. */
export function defaultCtaUrl(planKey: string): string {
  return `/organisation-eintragen?plan=${encodeURIComponent(planKey)}`;
}

/**
 * Betrag mit der Währung des Tarifs.
 *
 * Fast alle Tarife sind in Franken ausgewiesen; die Währung ist trotzdem am
 * Tarif hinterlegt, damit eine Ausnahme nicht zu einer falsch beschrifteten
 * Zahl führt.
 */
export function formatPlanPrice(value: number, currency?: string | null): string {
  const code = (currency ?? "").trim().toUpperCase() || "CHF";
  try {
    return new Intl.NumberFormat("de-CH", {
      style: "currency",
      currency: code,
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value);
  } catch {
    // Unbekannter Währungscode – lieber die Zahl mit Code zeigen als abstürzen.
    return `${code} ${value.toFixed(value % 1 === 0 ? 0 : 2)}`;
  }
}

export const planWithFeatures = {
  features: {
    include: { feature: true },
    orderBy: { feature: { sortOrder: "asc" } },
  },
} as const;

/** Alle Tarife für die Verwaltung – auch inaktive und interne. */
export async function allPlansForAdmin() {
  return prisma.plan.findMany({
    include: {
      features: { include: { feature: true } },
      _count: { select: { subscriptions: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { priceChf: "asc" }],
  });
}

/** Alle Leistungen, also die Zeilen der Vergleichstabelle. */
export async function allFeatures() {
  return prisma.feature.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
}
