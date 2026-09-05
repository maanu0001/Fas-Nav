import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarPlus, Plus } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { Table, TableWrapper, Td, Th, Thead, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { PageHeader } from "@/components/dashboard/page-header";
import { PublicationBadge } from "@/components/dashboard/status-badge";
import { EVENT_TYPE_LABELS, FEATURE_KEYS } from "@/lib/constants";
import { getDashboardContext, requireOrganizationContext } from "@/lib/dashboard-context";
import { formatDateTime, startOfToday } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { featureAccess } from "@/lib/subscription";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Veranstaltungen" };

export default async function EventsPage() {
  // Admin und Team verwalten alle Veranstaltungen; ihre vollständige Liste ist
  // die Agenda. Ohne diese Weiche landeten sie auf der Organisationsübersicht
  // und hätten von hier aus keinen Zugang zu den Veranstaltungen.
  const base = await getDashboardContext();
  if (base.staff) redirect("/dashboard/agenda");

  const context = await requireOrganizationContext();
  const today = startOfToday();

  const [upcoming, past, total] = await Promise.all([
    prisma.event.findMany({
      where: { organizationId: context.organization.id, startDate: { gte: today } },
      orderBy: { startDate: "asc" },
      select: {
        id: true,
        title: true,
        type: true,
        startDate: true,
        city: true,
        status: true,
      },
    }),
    prisma.event.findMany({
      where: { organizationId: context.organization.id, startDate: { lt: today } },
      orderBy: { startDate: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        type: true,
        startDate: true,
        city: true,
        status: true,
      },
    }),
    prisma.event.count({ where: { organizationId: context.organization.id } }),
  ]);

  const access = featureAccess(context.subscription, FEATURE_KEYS.EVENTS);
  const limitReached = access.limit !== null && total >= access.limit;

  function renderTable(events: typeof upcoming) {
    return (
      <TableWrapper>
        <Table>
          <Thead>
            <Tr>
              <Th>Titel</Th>
              <Th>Art</Th>
              <Th>Datum</Th>
              <Th>Ort</Th>
              <Th>Status</Th>
            </Tr>
          </Thead>
          <tbody>
            {events.map((event) => (
              <Tr key={event.id}>
                <Td>
                  <Link
                    href={`/dashboard/veranstaltungen/${event.id}`}
                    className="font-medium text-primary-800 hover:underline"
                  >
                    {event.title}
                  </Link>
                </Td>
                <Td className="text-muted-foreground">{EVENT_TYPE_LABELS[event.type]}</Td>
                <Td className="whitespace-nowrap text-muted-foreground">
                  {formatDateTime(event.startDate)}
                </Td>
                <Td className="text-muted-foreground">{event.city}</Td>
                <Td>
                  <PublicationBadge status={event.status} />
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrapper>
    );
  }

  return (
    <>
      <PageHeader
        title="Veranstaltungen"
        description={
          access.limit !== null
            ? `${total} von ${access.limit} Veranstaltungen deines Tarifs genutzt.`
            : `${total} Veranstaltungen erfasst.`
        }
        actions={
          limitReached ? (
            <ButtonLink href="/dashboard/abonnement" variant="outline">
              Tarif erweitern
            </ButtonLink>
          ) : (
            <ButtonLink href="/dashboard/veranstaltungen/neu">
              <Plus />
              Veranstaltung erstellen
            </ButtonLink>
          )
        }
      />

      {limitReached ? (
        <p className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Du hast das Limit deines Tarifs erreicht. Mit einem Upgrade kannst du weitere
          Veranstaltungen erfassen.
        </p>
      ) : null}

      <section className="mb-8">
        <h2 className="mb-3 font-display text-base font-semibold">Kommende Veranstaltungen</h2>
        {upcoming.length ? (
          renderTable(upcoming)
        ) : (
          <EmptyState
            icon={CalendarPlus}
            title="Keine kommenden Veranstaltungen"
            description="Erfasse deine Termine, damit sie in der schweizweiten Fas-Nav-Agenda erscheinen."
            action={
              limitReached ? undefined : (
                <ButtonLink href="/dashboard/veranstaltungen/neu">
                  <Plus />
                  Erste Veranstaltung erstellen
                </ButtonLink>
              )
            }
          />
        )}
      </section>

      {past.length ? (
        <section>
          <h2 className="mb-3 font-display text-base font-semibold">Vergangene Veranstaltungen</h2>
          {renderTable(past)}
        </section>
      ) : null}
    </>
  );
}
