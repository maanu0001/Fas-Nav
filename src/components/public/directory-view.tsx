import { PartyPopper } from "lucide-react";

import { FilterBar } from "@/components/public/filter-bar";
import {
  OrganizationCard,
  type OrganizationCardData,
} from "@/components/public/organization-card";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/states";
import { CANTONS, REGIONS } from "@/lib/constants";
import type { OrganizationType } from "@prisma/client";

/** Gemeinsame Verzeichnisansicht für Fasnachten und Guggen. */
export function DirectoryView({
  type,
  title,
  eyebrow,
  description,
  result,
  buildHref,
  emptyHint,
}: {
  type: OrganizationType;
  title: string;
  eyebrow: string;
  description: string;
  result: {
    items: OrganizationCardData[];
    total: number;
    page: number;
    totalPages: number;
  };
  buildHref: (overrides: Record<string, string | undefined>) => string;
  emptyHint: string;
}) {
  const sortOptions = [
    { value: "name", label: "Alphabetisch" },
    ...(type === "CARNIVAL"
      ? [{ value: "upcoming", label: "Nächste Fasnacht zuerst" }]
      : []),
    { value: "newest", label: "Neuste zuerst" },
  ];

  return (
    <>
      <div className="border-b border-border bg-muted/40">
        <div className="container py-10 sm:py-14">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent-600">
            {eyebrow}
          </p>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>

      <div className="container py-8">
        <FilterBar
          searchPlaceholder={
            type === "CARNIVAL" ? "Fasnacht oder Ort suchen …" : "Gugge oder Ort suchen …"
          }
          filters={[
            {
              name: "canton",
              label: "Kanton",
              options: CANTONS.map((c) => ({ value: c.slug, label: c.name })),
              placeholder: "Alle Kantone",
            },
            {
              name: "region",
              label: "Region",
              options: REGIONS.map((r) => ({ value: r, label: r })),
              placeholder: "Alle Regionen",
            },
            {
              name: "sort",
              label: "Sortierung",
              options: sortOptions,
              placeholder: "Alphabetisch",
            },
            ...(type === "GUGGE"
              ? [
                  {
                    name: "foundedFrom",
                    label: "Gegründet ab",
                    options: [1950, 1970, 1980, 1990, 2000, 2010, 2020].map((y) => ({
                      value: String(y),
                      label: `${y} oder später`,
                    })),
                    placeholder: "Beliebig",
                  },
                ]
              : []),
          ]}
          className="mb-6"
        />

        <p className="mb-5 text-sm text-muted-foreground">
          {result.total} {result.total === 1 ? "Eintrag" : "Einträge"}
        </p>

        {result.items.length ? (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {result.items.map((org) => (
                <OrganizationCard key={org.id} organization={org} />
              ))}
            </div>
            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              buildHref={(p) => buildHref({ page: String(p) })}
              className="mt-10"
            />
          </>
        ) : (
          <EmptyState icon={PartyPopper} title="Keine Einträge gefunden" description={emptyHint} />
        )}
      </div>
    </>
  );
}

/** Baut aus Suchparametern eine URL und entfernt leere Werte. */
export function hrefBuilder(base: string, raw: Record<string, string | string[] | undefined>) {
  return (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...raw, ...overrides })) {
      if (typeof value === "string" && value) params.set(key, value);
    }
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  };
}
