import type { Metadata } from "next";

import { DirectoryView, hrefBuilder } from "@/components/public/directory-view";
import { findOrganizations } from "@/lib/queries/public";
import { buildMetadata, listCanonical } from "@/lib/seo";
import { directoryFilterSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

/**
 * Metadata je nach Adressparametern.
 *
 * Geblätterte Seiten verweisen auf sich selbst, gefilterte auf die
 * unveränderte Liste und tragen noindex – siehe listCanonical.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const params = await searchParams;
  const { path, noIndex } = listCanonical("/fasnachten", params);

  return buildMetadata({
    title: "Fasnachten in der Schweiz – Termine und Übersicht",
    description:
      "Alle Schweizer Fasnachten im Überblick: Termine, Orte und Programme. Suche nach Name, Ort, Kanton oder Region.",
    path,
    keywords: ["Fasnacht Schweiz", "Fasnachten", "Fasnachtsverzeichnis", "Fasnacht Termine"],
    noIndex,
  });
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function FasnachtenPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const parsed = directoryFilterSchema.safeParse(raw);
  const filters = parsed.success ? parsed.data : {};

  const result = await findOrganizations({ type: "CARNIVAL", ...filters, perPage: 12 });

  return (
    <DirectoryView
      type="CARNIVAL"
      eyebrow="Verzeichnis"
      title="Fasnachten in der Schweiz"
      description="Von der Basler Fasnacht bis zur Dorffasnacht: Finde Fasnachten in deiner Region, erfahre wann sie stattfinden und was sie ausmacht."
      result={result}
      buildHref={hrefBuilder("/fasnachten", raw)}
      emptyHint="Passe die Filter an oder entferne den Suchbegriff. Neue Fasnachten kommen laufend dazu."
    />
  );
}
