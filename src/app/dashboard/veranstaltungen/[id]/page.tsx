import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { EventForm } from "@/components/dashboard/event-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { prisma } from "@/lib/prisma";
import { requireOrgAccess } from "@/lib/rbac";
import { toDateTimeInputValue } from "@/lib/dates";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id }, select: { title: true } });
  return { title: event?.title ?? "Veranstaltung" };
}

export default async function EditEventPage({ params }: Params) {
  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      slug: true,
      type: true,
      shortDescription: true,
      description: true,
      startDate: true,
      endDate: true,
      allDay: true,
      venueName: true,
      street: true,
      zip: true,
      city: true,
      cantonId: true,
      organizerName: true,
      externalUrl: true,
      ticketUrl: true,
      price: true,
      priceInfo: true,
      status: true,
      organizationId: true,
      image: {
        select: { id: true, url: true, thumbnailUrl: true, alt: true, width: true, height: true },
      },
    },
  });

  if (!event) notFound();

  // Zugriffsprüfung über die Organisation der Veranstaltung.
  await requireOrgAccess(event.organizationId);

  const cantons = await prisma.canton.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <PageHeader
        title={event.title}
        breadcrumbs={[
          { href: "/dashboard/veranstaltungen", label: "Veranstaltungen" },
          { label: event.title },
        ]}
        actions={
          event.status === "PUBLISHED" ? (
            <ButtonLink
              href={`/event/${event.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              variant="outline"
            >
              Öffentliche Seite
              <ExternalLink />
            </ButtonLink>
          ) : null
        }
      />

      <EventForm
        organizationId={event.organizationId}
        eventId={event.id}
        cantons={cantons}
        initial={{
          title: event.title,
          type: event.type,
          shortDescription: event.shortDescription ?? "",
          description: event.description ?? "",
          startDate: toDateTimeInputValue(event.startDate),
          endDate: toDateTimeInputValue(event.endDate),
          allDay: event.allDay,
          venueName: event.venueName ?? "",
          street: event.street ?? "",
          zip: event.zip ?? "",
          city: event.city,
          cantonId: event.cantonId,
          organizerName: event.organizerName ?? "",
          externalUrl: event.externalUrl ?? "",
          ticketUrl: event.ticketUrl ?? "",
          price: event.price !== null ? String(event.price) : "",
          priceInfo: event.priceInfo ?? "",
          status: event.status,
          image: event.image,
        }}
      />
    </>
  );
}
