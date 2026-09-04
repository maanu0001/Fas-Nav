import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { EventForm } from "@/components/dashboard/event-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { FEATURE_KEYS } from "@/lib/constants";
import { requireOrganizationContext } from "@/lib/dashboard-context";
import { prisma } from "@/lib/prisma";
import { withinLimit } from "@/lib/subscription";
import { toDateTimeInputValue } from "@/lib/dates";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Neue Veranstaltung" };

export default async function NewEventPage() {
  const context = await requireOrganizationContext();

  const [organization, cantons, count] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: context.organization.id },
      select: { city: true, cantonId: true, zip: true, street: true },
    }),
    prisma.canton.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.event.count({ where: { organizationId: context.organization.id } }),
  ]);

  // Limitprüfung auch beim Aufruf der Seite – nicht erst beim Speichern.
  const check = withinLimit(context.subscription, FEATURE_KEYS.EVENTS, count);
  if (!check.allowed) redirect("/dashboard/veranstaltungen");

  // Vorschlag: Beginn morgen um 14 Uhr – spart Tipparbeit.
  const suggested = new Date();
  suggested.setDate(suggested.getDate() + 1);
  suggested.setHours(14, 0, 0, 0);

  return (
    <>
      <PageHeader
        title="Neue Veranstaltung"
        description="Erfasse deinen Termin. Nach der Veröffentlichung erscheint er in der schweizweiten Agenda."
        breadcrumbs={[
          { href: "/dashboard/veranstaltungen", label: "Veranstaltungen" },
          { label: "Neu" },
        ]}
      />

      <EventForm
        organizationId={context.organization.id}
        cantons={cantons}
        canDelete={false}
        initial={{
          title: "",
          type: "SONSTIGE",
          shortDescription: "",
          description: "",
          startDate: toDateTimeInputValue(suggested),
          endDate: "",
          allDay: false,
          venueName: "",
          street: organization?.street ?? "",
          zip: organization?.zip ?? "",
          city: organization?.city ?? "",
          cantonId: organization?.cantonId ?? cantons[0]?.id ?? "",
          organizerName: "",
          externalUrl: "",
          ticketUrl: "",
          price: "",
          priceInfo: "",
          status: "DRAFT",
          image: null,
        }}
      />
    </>
  );
}
