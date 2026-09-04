import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Music2, PartyPopper, Search } from "lucide-react";

import { EventListItem } from "@/components/public/event-card";
import { OrganizationCard } from "@/components/public/organization-card";
import { EmptyState } from "@/components/ui/states";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { globalSearch } from "@/lib/queries/public";
import { logSearch } from "@/lib/analytics";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string }>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { q } = await searchParams;
  return buildMetadata({
    title: q ? `Suche nach „${q}“` : "Suche",
    description:
      "Durchsuche Fasnachten, Guggenmusiken, Veranstaltungen und Orte in der ganzen Schweiz.",
    path: "/suche",
    // Suchergebnisseiten gehören nicht in den Suchindex.
    noIndex: true,
  });
}

function ResultGroup({
  title,
  icon: Icon,
  count,
  href,
  children,
}: {
  title: string;
  icon: React.ElementType;
  count: number;
  href?: string;
  children: React.ReactNode;
}) {
  if (!count) return null;
  return (
    <section className="mb-12">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold">
          <Icon className="h-5 w-5 text-accent-600" aria-hidden />
          {title}
          <span className="text-sm font-normal text-muted-foreground">({count})</span>
        </h2>
        {href ? (
          <Link href={href} className="text-sm font-semibold text-primary-700 hover:underline">
            Alle anzeigen
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const { q } = await searchParams;
  const term = (q ?? "").trim().slice(0, 120);
  const results = term.length >= 2 ? await globalSearch(term) : null;

  if (results) {
    // Suchbegriffe fliessen anonym in die Plattformstatistik.
    await logSearch(term, results.total);
  }

  return (
    <div className="container py-10 sm:py-14">
      <h1 className="font-display text-3xl font-bold sm:text-4xl">Suche</h1>

      <form action="/suche" method="get" className="mt-6 flex max-w-2xl gap-2" role="search">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            name="q"
            defaultValue={term}
            placeholder="Fasnacht, Gugge, Veranstaltung oder Ort …"
            aria-label="Suchbegriff"
            className="h-12 pl-9"
            autoFocus
          />
        </div>
        <Button type="submit" size="lg">
          Suchen
        </Button>
      </form>

      {!results ? (
        <p className="mt-8 text-sm text-muted-foreground">
          Gib mindestens zwei Zeichen ein, um zu suchen.
        </p>
      ) : results.total === 0 ? (
        <EmptyState
          className="mt-10"
          icon={Search}
          title={`Keine Treffer für „${term}“`}
          description="Versuche es mit einem anderen Begriff, etwa dem Namen einer Fasnacht, einer Gugge oder eines Ortes."
        />
      ) : (
        <div className="mt-10">
          <p className="mb-8 text-sm text-muted-foreground">
            {results.total} Treffer für <span className="font-medium text-foreground">„{term}“</span>
          </p>

          <ResultGroup
            title="Fasnachten"
            icon={PartyPopper}
            count={results.carnivals.length}
            href={`/fasnachten?q=${encodeURIComponent(term)}`}
          >
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {results.carnivals.slice(0, 6).map((org) => (
                <OrganizationCard key={org.id} organization={org} />
              ))}
            </div>
          </ResultGroup>

          <ResultGroup
            title="Guggenmusiken"
            icon={Music2}
            count={results.guggen.length}
            href={`/guggen?q=${encodeURIComponent(term)}`}
          >
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {results.guggen.slice(0, 6).map((org) => (
                <OrganizationCard key={org.id} organization={org} />
              ))}
            </div>
          </ResultGroup>

          <ResultGroup
            title="Veranstaltungen"
            icon={Search}
            count={results.events.length}
            href={`/agenda?q=${encodeURIComponent(term)}`}
          >
            <div className="space-y-3">
              {results.events.map((event) => (
                <EventListItem key={event.id} event={event} />
              ))}
            </div>
          </ResultGroup>

          <ResultGroup title="Kantone und Regionen" icon={MapPin} count={results.cantons.length}>
            <ul className="flex flex-wrap gap-2">
              {results.cantons.map((canton) => (
                <li key={canton.slug}>
                  <Link
                    href={`/kanton/${canton.slug}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium transition-colors hover:bg-secondary"
                  >
                    <span className="font-display text-xs font-bold text-primary-700">
                      {canton.code}
                    </span>
                    {canton.name}
                  </Link>
                </li>
              ))}
            </ul>
          </ResultGroup>
        </div>
      )}
    </div>
  );
}
