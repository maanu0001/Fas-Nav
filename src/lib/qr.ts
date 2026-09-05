import type { OrganizationType } from "@prisma/client";

import { FEATURE_KEYS, type FeatureKey } from "@/lib/constants";
import { absoluteUrl } from "@/lib/utils";

/**
 * QR-Ziele für Organisationen.
 *
 * Dieser Katalog ist die einzige Stelle, an der festgelegt ist, wofür ein
 * QR-Code erzeugt werden kann. Ein weiteres Ziel ist ein zusätzlicher Eintrag
 * – Oberfläche, Endpunkt und Berechtigungsprüfung übernehmen ihn ohne weitere
 * Änderung.
 *
 * Zwei Regeln liegen dem zugrunde:
 *
 * 1. Es werden ausschliesslich Adressen abgebildet, die es in der Anwendung
 *    tatsächlich gibt. Für dieses Feature wird keine Seite erfunden. Eine
 *    öffentliche Karte existiert derzeit nicht und fehlt deshalb im Katalog.
 * 2. Die Codes werden bei Bedarf aus der Adresse berechnet und nicht als
 *    Bilddateien gespeichert. Ändert sich ein Slug, stimmt der Code sofort.
 */

export type QrTargetKey = "profile" | "program" | "events" | "gallery";

export type QrTarget = {
  key: QrTargetKey;
  label: string;
  description: string;
  /** Ohne Angabe für alle verfügbar, sonst nur mit diesem Tarifmerkmal. */
  feature: FeatureKey | null;
  /** Anker auf der öffentlichen Profilseite; leer für die Seite selbst. */
  hash: string;
};

export const QR_TARGETS: QrTarget[] = [
  {
    key: "profile",
    label: "Organisationsseite",
    description: "Die öffentliche Seite mit allen Angaben.",
    feature: null,
    hash: "",
  },
  {
    key: "program",
    label: "Programm",
    description: "Springt direkt zur Programmübersicht.",
    feature: FEATURE_KEYS.PROGRAM,
    hash: "#programm",
  },
  {
    key: "events",
    label: "Tagesprogramm und Termine",
    description: "Springt direkt zu den Veranstaltungen.",
    feature: FEATURE_KEYS.EVENTS,
    hash: "#agenda",
  },
  {
    key: "gallery",
    label: "Galerie",
    description: "Springt direkt zu den Bildern.",
    feature: FEATURE_KEYS.GALLERY,
    hash: "#galerie",
  },
];

export function findQrTarget(key: string): QrTarget | undefined {
  return QR_TARGETS.find((target) => target.key === key);
}

/** Pfad der öffentlichen Seite – dieselbe Struktur wie im übrigen Projekt. */
export function organizationPublicPath(org: {
  type: OrganizationType;
  slug: string;
}): string {
  return org.type === "CARNIVAL" ? `/fasnacht/${org.slug}` : `/gugge/${org.slug}`;
}

/** Die kanonische Adresse, auf die ein QR-Code zeigt. */
export function qrTargetUrl(
  org: { type: OrganizationType; slug: string },
  target: QrTarget,
): string {
  return `${absoluteUrl(organizationPublicPath(org))}${target.hash}`;
}

/** Dateiname für den Download, ohne Sonderzeichen. */
export function qrFileName(slug: string, target: QrTargetKey, extension: "png" | "svg"): string {
  const suffix = target === "profile" ? "" : `-${target}`;
  return `fas-nav-qr-${slug}${suffix}.${extension}`;
}
