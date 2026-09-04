import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, Music2, PartyPopper } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { EventListItem } from "@/components/public/event-card";
import { OrganizationCard } from "@/components/public/organization-card";
import { SectionHeading } from "@/components/public/section";
import { EmptyState } from "@/components/ui/states";
import { prisma } from "@/lib/prisma";
import {
  PUBLIC_EVENT_SELECT,
  PUBLIC_ORG_SELECT,
  buildEventWhere,
  publishedOrgWhere,
} from "@/lib/queries/public";
import { breadcrumbJsonLd, buildMetadata, jsonLdScript } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };


async function getCanton(slug: string) {
  return prisma.canton.findUnique({
    where: { slug },
    select: {
      id: true,
      code: true,
      name: true,
      slug: true,
      region: true,
      description: true,
      metaTitle: true,
      metaDesc: true,
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const canton = await getCanton(slug);
  if (!canton) {
    return buildMetadata({ title: "Kanton nicht gefunden", path: `/kanton/${slug}`, noIndex: true });
  }

  return buildMetadata({
    title: canton.metaTitle || `Fasnacht ${canton.name} – Termine, Fasnachten und Guggen`,
    description:
      canton.metaDesc ||
      `Alle Fasnachten, Guggenmusiken und Fasnachtsveranstaltungen im Kanton ${canton.name}. Termine, Umzüge und Konzerte auf einen Blick.`,
    path: `/kanton/${canton.slug}`,
    keywords: [
      `Fasnacht ${canton.name}`,
      `Fasnacht ${canton.code}`,
      `Guggenmusik ${canton.name}`,
      `Fasnachtsumzug ${canton.name}`,
      `Fasnacht ${canton.name} Termine`,
    ],
  });
}

export default async function CantonPage({ params }: Props) {
  const { slug } = await params;
  const canton = await getCanton(slug);
  if (!canton) notFound();

  const [carnivals, guggen, events, cities] = await Promise.all([
    prisma.organization.findMany({
      where: { ...publishedOrgWhere, type: "CARNIVAL", cantonId: canton.id },
      select: PUBLIC_ORG_SELECT,
      orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
      take: 12,
    }),
    prisma.organization.findMany({
      where: { ...publishedOrgWhere, type: "GUGGE", cantonId: canton.id },
      select: PUBLIC_ORG_SELECT,
      orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
      take: 12,
    }),
    prisma.event.findMany({
      where: buildEventWhere({ canton: canton.slug, upcomingOnly: true }),
      select: PUBLIC_EVENT_SELECT,
      orderBy: { startDate: "asc" },
      take: 10,
    }),
    prisma.organization.groupBy({
      by: ["city"],
      where: { ...publishedOrgWhere, cantonId: canton.id },
      _count: { city: true },
      orderBy: { _count: { city: "desc" } },
      take: 12,
    }),
  ]);

  const isEmpty = !carnivals.length && !guggen.length && !events.length;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(
          breadcrumbJsonLd([
            { name: "Startseite", path: "/" },
            { name: "Kantone", path: "/kantone" },
            { name: canton.name, path: `/kanton/${canton.slug}` },
          ]),
        )}
      />

      <div className="border-b border-border bg-hero text-white">
        <div className="container py-14 sm:py-20">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] backdrop-blur">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            {canton.region}
          </p>
          <h1 className="font-display text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            Fasnacht im Kanton {canton.name}
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/75">
            {canton.description ||
              `Fasnachten, Guggenmusiken und Veranstaltungen im Kanton ${canton.name} (${canton.code}) – von der Vorfasnacht bis zum Abschluss.`}
          </p>

          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
            {[
              { label: "Fasnachten", value: carnivals.length, icon: PartyPopper },
              { label: "Guggen", value: guggen.length, icon: Music2 },
              { label: "Kommende Termine", value: events.length, icon: CalendarDays },
            ].map((stat) => (
              <div key={stat.label}>
                <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-white/60">
                  <stat.icon className="h-3.5 w-3.5" aria-hidden />
                  {stat.label}
                </dt>
                <dd className="mt-1 font-display text-2xl font-bold text-white">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="container py-12">
        {isEmpty ? (
          <EmptyState
            icon={MapPin}
            title={`Noch keine Einträge im Kanton ${canton.name}`}
            description="Für diesen Kanton sind aktuell keine Organisationen veröffentlicht. Wenn du eine Fasnacht oder Gugge in dieser Region vertrittst, kannst du sie kostenlos eintragen lassen."
            action={
              <ButtonLink href="/organisation-eintragen" variant="primary">
                Organisation eintragen
              </ButtonLink>
            }
          />
        ) : null}

        {events.length ? (
          <section className="mb-16">
            <SectionHeading
              title={`Kommende Veranstaltungen in ${canton.name}`}
              description="Umzüge, Konzerte und Bälle in der Region – chronologisch sortiert."
              action={{ href: `/agenda?canton=${canton.slug}`, label: "Ganze Agenda" }}
            />
            <div className="space-y-3">
              {events.map((event) => (
                <EventListItem key={event.id} event={event} />
              ))}
            </div>
          </section>
        ) : null}

        {carnivals.length ? (
          <section className="mb-16">
            <SectionHeading
              title={`Fasnachten im Kanton ${canton.name}`}
              action={{ href: `/fasnachten?canton=${canton.slug}`, label: "Alle anzeigen" }}
            />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {carnivals.map((org) => (
                <OrganizationCard key={org.id} organization={org} />
              ))}
            </div>
          </section>
        ) : null}

        {guggen.length ? (
          <section className="mb-16">
            <SectionHeading
              title={`Guggenmusiken im Kanton ${canton.name}`}
              action={{ href: `/guggen?canton=${canton.slug}`, label: "Alle anzeigen" }}
            />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {guggen.map((org) => (
                <OrganizationCard key={org.id} organization={org} />
              ))}
            </div>
          </section>
        ) : null}

        {cities.length ? (
          <section className="border-t border-border pt-10">
            <h2 className="mb-4 font-display text-lg font-bold">Orte im Kanton {canton.name}</h2>
            <ul className="flex flex-wrap gap-2">
              {cities.map((city) => (
                <li key={city.city}>
                  <Link
                    href={`/fasnachten?canton=${canton.slug}&city=${encodeURIComponent(city.city)}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm transition-colors hover:bg-secondary"
                  >
                    {city.city}
                    <span className="text-xs text-muted-foreground">{city._count.city}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  );
}
