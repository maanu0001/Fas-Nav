import type { Metadata } from "next";

import { SITE } from "@/lib/constants";
import { absoluteUrl, truncate } from "@/lib/utils";

type SeoInput = {
  title: string;
  description?: string | null;
  path: string;
  image?: string | null;
  type?: "website" | "article" | "profile";
  noIndex?: boolean;
  /**
   * Zusätzlich den Verweisen nicht folgen.
   *
   * Getrennt von noIndex, weil beides Verschiedenes bedeutet. Eine dünne
   * Profilseite oder eine Filteransicht gehört nicht in den Index, ihre
   * Verweise auf Kanton, Veranstalter und Termine sollen aber weiterhin
   * verfolgt werden – sonst kappt die Massnahme genau die interne
   * Verlinkung, die sie schützen soll. Nur wirklich private Seiten wie
   * Anmeldung und Passwortvergabe setzen zusätzlich nofollow.
   */
  noFollow?: boolean;
  keywords?: string[];
};

/**
 * Entscheidet über Canonical und Indexierung einer Listenseite.
 *
 * Listen werden über Adressparameter gefiltert, sortiert und geblättert. Daraus
 * entstehen beliebig viele Adressen mit weitgehend denselben Inhalten. Die
 * Regel dagegen:
 *
 * - Nur Blättern erzeugt eine eigene Seite. Seite 2 zeigt andere Einträge als
 *   Seite 1 und bekommt deshalb ein Canonical auf sich selbst. Verwiese sie auf
 *   Seite 1, würden ihre Einträge nie eigenständig bewertet.
 * - Jeder andere Parameter – Suche, Kanton, Region, Sortierung, Ansicht –
 *   erzeugt eine Auswahl, keine neue Seite. Diese Adressen zeigen per Canonical
 *   auf die unveränderte Liste und tragen zusätzlich `noindex`. Das Canonical
 *   allein wäre eine Empfehlung; erst `noindex` verhindert zuverlässig, dass
 *   der Index mit Filterkombinationen zuwächst. Gefolgt wird den Verweisen
 *   weiterhin, damit Google die verlinkten Detailseiten findet.
 */
export function listCanonical(
  basisPfad: string,
  params: Record<string, string | string[] | undefined>,
): { path: string; noIndex: boolean } {
  const seite = Number(Array.isArray(params.page) ? params.page[0] : params.page);
  const geblaettert = Number.isFinite(seite) && seite > 1;

  const weitereFilter = Object.entries(params).some(
    ([schluessel, wert]) => schluessel !== "page" && wert !== undefined && wert !== "",
  );

  if (weitereFilter) return { path: basisPfad, noIndex: true };
  if (geblaettert) return { path: `${basisPfad}?page=${Math.floor(seite)}`, noIndex: false };
  return { path: basisPfad, noIndex: false };
}

/** Baut konsistente Metadaten inklusive canonical URL und OpenGraph. */
export function buildMetadata({
  title,
  description,
  path,
  image,
  type = "website",
  noIndex = false,
  noFollow = false,
  keywords,
}: SeoInput): Metadata {
  const url = absoluteUrl(path);
  const desc = truncate(description?.trim() || SITE.description, 180);
  const ogImage = image ? (image.startsWith("http") ? image : absoluteUrl(image)) : absoluteUrl("/brand/og-default.png");

  return {
    title,
    description: desc,
    keywords,
    alternates: { canonical: url },
    robots: noIndex
      ? { index: false, follow: !noFollow }
      : { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    openGraph: {
      type: type === "profile" ? "website" : type,
      title,
      description: desc,
      url,
      siteName: SITE.name,
      locale: "de_CH",
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [ogImage],
    },
  };
}

/** Rendert JSON-LD sicher als Script-Tag. */
export function jsonLdScript(data: Record<string, unknown> | Record<string, unknown>[]) {
  return {
    __html: JSON.stringify(data).replace(/</g, "\\u003c"),
  };
}

export function organizationJsonLd(input: {
  name: string;
  slug: string;
  type: "CARNIVAL" | "GUGGE";
  description?: string | null;
  logo?: string | null;
  image?: string | null;
  city: string;
  zip?: string | null;
  street?: string | null;
  cantonName: string;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  foundedYear?: number | null;
  sameAs?: string[];
}) {
  const path = input.type === "CARNIVAL" ? `/fasnacht/${input.slug}` : `/gugge/${input.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": input.type === "GUGGE" ? "MusicGroup" : "Organization",
    name: input.name,
    url: absoluteUrl(path),
    ...(input.description ? { description: truncate(input.description, 300) } : {}),
    ...(input.logo ? { logo: absoluteUrl(input.logo) } : {}),
    ...(input.image ? { image: absoluteUrl(input.image) } : {}),
    ...(input.foundedYear ? { foundingDate: String(input.foundedYear) } : {}),
    address: {
      "@type": "PostalAddress",
      addressLocality: input.city,
      addressRegion: input.cantonName,
      addressCountry: "CH",
      ...(input.zip ? { postalCode: input.zip } : {}),
      ...(input.street ? { streetAddress: input.street } : {}),
    },
    ...(input.email ? { email: input.email } : {}),
    ...(input.phone ? { telephone: input.phone } : {}),
    ...(input.sameAs?.length ? { sameAs: input.sameAs } : {}),
  };
}

export function eventJsonLd(input: {
  title: string;
  slug: string;
  description?: string | null;
  startDate: Date;
  endDate?: Date | null;
  venueName?: string | null;
  street?: string | null;
  zip?: string | null;
  city: string;
  cantonName: string;
  image?: string | null;
  organizerName: string;
  organizerUrl?: string | null;
  price?: number | null;
  ticketUrl?: string | null;
  isPast: boolean;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: input.title,
    url: absoluteUrl(`/event/${input.slug}`),
    startDate: input.startDate.toISOString(),
    ...(input.endDate ? { endDate: input.endDate.toISOString() } : {}),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    ...(input.description ? { description: truncate(input.description, 300) } : {}),
    ...(input.image ? { image: [absoluteUrl(input.image)] } : {}),
    location: {
      "@type": "Place",
      name: input.venueName || input.city,
      address: {
        "@type": "PostalAddress",
        addressLocality: input.city,
        addressRegion: input.cantonName,
        addressCountry: "CH",
        ...(input.zip ? { postalCode: input.zip } : {}),
        ...(input.street ? { streetAddress: input.street } : {}),
      },
    },
    organizer: {
      "@type": "Organization",
      name: input.organizerName,
      ...(input.organizerUrl ? { url: absoluteUrl(input.organizerUrl) } : {}),
    },
    ...(input.price !== null && input.price !== undefined
      ? {
          offers: {
            "@type": "Offer",
            price: input.price,
            priceCurrency: "CHF",
            availability: input.isPast
              ? "https://schema.org/SoldOut"
              : "https://schema.org/InStock",
            ...(input.ticketUrl ? { url: input.ticketUrl } : {}),
          },
        }
      : {}),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: absoluteUrl("/"),
    description: SITE.description,
    inLanguage: "de-CH",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absoluteUrl("/suche")}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}
