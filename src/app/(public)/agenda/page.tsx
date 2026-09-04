import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, List } from "lucide-react";

import { EventListItem } from "@/components/public/event-card";
import { EventCalendar, parseMonth } from "@/components/public/event-calendar";
import { DateRangeFilter, FilterBar } from "@/components/public/filter-bar";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/states";
import { CANTONS, EVENT_TYPE_LABELS, REGIONS } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { buildEventWhere, findEvents, PUBLIC_EVENT_SELECT } from "@/lib/queries/public";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";
import { agendaFilterSchema } from "@/lib/validation/schemas";
import { cn } from "@/lib/utils";
import type { EventType } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Fasnachtsagenda Schweiz – alle Termine",
  description:
    "Die schweizweite Fasnachtsagenda: Umzüge, Guggenkonzerte, Monsterkonzerte, Maskenbälle und Kinderfasnachten. Filtere nach Datum, Kanton, Ort und Veranstaltungstyp.",
  path: "/agenda",
  keywords: ["Fasnacht Termine", "Fasnachtsagenda", "Umzug", "Guggenkonzert", "Monsterkonzert"],
});

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AgendaPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  // Ungültige Parameter führen nie zu einem Fehler, sondern zur Standardansicht.
  const parsed = agendaFilterSchema.safeParse(raw);
  const filters = parsed.success ? parsed.data : {};

  const isCalendar = filters.view === "calendar";
  const month = parseMonth(filters.month);

  const baseFilters = {
    q: filters.q,
    canton: filters.canton,
    region: filters.region,
    city: filters.city,
    type: filters.type as EventType | undefined,
    organizationType: filters.orgType,
    from: filters.from ? new Date(filters.from) : undefined,
    to: filters.to ? new Date(filters.to) : undefined,
  };

  // Listenansicht zeigt nur kommende Termine; der Kalender zeigt den ganzen Monat.
  const listResult = isCalendar
    ? null
    : await findEvents({ ...baseFilters, upcomingOnly: !filters.from, page: filters.page, perPage: 20 });

  const calendarEvents = isCalendar
    ? await prisma.event.findMany({
        where: buildEventWhere({
          ...baseFilters,
          from: new Date(month.getFullYear(), month.getMonth(), 1),
          to: new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59),
        }),
        select: PUBLIC_EVENT_SELECT,
        orderBy: { startDate: "asc" },
        take: 400,
      })
    : [];

  function buildHref(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...raw, ...overrides })) {
      if (typeof value === "string" && value) params.set(key, value);
    }
    const qs = params.toString();
    return qs ? `/agenda?${qs}` : "/agenda";
  }

  const viewTabs = [
    { view: "list", label: "Liste", icon: List },
    { view: "calendar", label: "Kalender", icon: CalendarDays },
  ] as const;

  return (
    <>
      <div className="border-b border-border bg-muted/40">
        <div className="container py-10 sm:py-14">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent-600">
            Schweizweit
          </p>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Fasnachtsagenda</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            Umzüge, Guggenkonzerte, Monsterkonzerte, Maskenbälle und Kinderfasnachten – alle
            Termine der Schweizer Fasnacht an einem Ort.
          </p>
        </div>
      </div>

      <div className="container py-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-lg border border-border bg-card p-1" role="tablist">
            {viewTabs.map((tab) => {
              const active = (filters.view ?? "list") === tab.view;
              return (
                <Link
                  key={tab.view}
                  href={buildHref({ view: tab.view, page: undefined })}
                  role="tab"
                  aria-selected={active}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <tab.icon className="h-4 w-4" aria-hidden />
                  {tab.label}
                </Link>
              );
            })}
          </div>

          {listResult ? (
            <p className="text-sm text-muted-foreground">
              {listResult.total} {listResult.total === 1 ? "Veranstaltung" : "Veranstaltungen"}
            </p>
          ) : null}
        </div>

        <FilterBar
          searchPlaceholder="Veranstaltung, Ort oder Lokal suchen …"
          filters={[
            {
              name: "type",
              label: "Veranstaltungstyp",
              options: Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => ({ value, label })),
              placeholder: "Alle Typen",
            },
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
              name: "orgType",
              label: "Veranstalter",
              options: [
                { value: "CARNIVAL", label: "Fasnacht" },
                { value: "GUGGE", label: "Gugge" },
              ],
              placeholder: "Alle",
            },
          ]}
          extra={isCalendar ? undefined : <DateRangeFilter />}
          className="mb-6"
        />

        {isCalendar ? (
          <EventCalendar
            month={month}
            events={calendarEvents}
            buildMonthHref={(m) => buildHref({ month: m, view: "calendar" })}
          />
        ) : listResult && listResult.items.length ? (
          <>
            <div className="space-y-3">
              {listResult.items.map((event) => (
                <EventListItem key={event.id} event={event} />
              ))}
            </div>
            <Pagination
              page={listResult.page}
              totalPages={listResult.totalPages}
              buildHref={(p) => buildHref({ page: String(p) })}
              className="mt-8"
            />
          </>
        ) : (
          <EmptyState
            icon={CalendarDays}
            title="Keine Veranstaltungen gefunden"
            description={
              filters.q || filters.canton || filters.type
                ? "Für diese Filter sind aktuell keine Termine erfasst. Passe die Auswahl an oder schaue später wieder vorbei."
                : `Für den Zeitraum ab ${formatDate(new Date())} sind noch keine Veranstaltungen veröffentlicht.`
            }
          />
        )}
      </div>
    </>
  );
}
