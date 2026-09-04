import type { Metadata } from "next";

import { DirectoryView, hrefBuilder } from "@/components/public/directory-view";
import { findOrganizations } from "@/lib/queries/public";
import { buildMetadata } from "@/lib/seo";
import { directoryFilterSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Guggenmusiken in der Schweiz – Verzeichnis",
  description:
    "Das Verzeichnis der Schweizer Guggenmusiken: Gründungsjahr, Region, Auftritte und Kontakt. Finde Guggen in deiner Nähe.",
  path: "/guggen",
  keywords: ["Guggenmusik Schweiz", "Guggen", "Guggenmusik", "Guggenverzeichnis"],
});

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function GuggenPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const parsed = directoryFilterSchema.safeParse(raw);
  const filters = parsed.success ? parsed.data : {};

  const result = await findOrganizations({ type: "GUGGE", ...filters, perPage: 12 });

  return (
    <DirectoryView
      type="GUGGE"
      eyebrow="Verzeichnis"
      title="Guggenmusiken in der Schweiz"
      description="Entdecke Guggenmusiken aus der ganzen Schweiz – mit Auftrittsterminen, Geschichte und Kontakt für Buchungsanfragen."
      result={result}
      buildHref={hrefBuilder("/guggen", raw)}
      emptyHint="Passe die Filter an oder entferne den Suchbegriff. Neue Guggen kommen laufend dazu."
    />
  );
}
