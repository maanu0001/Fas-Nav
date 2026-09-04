import type { Metadata } from "next";

import { NewTicketForm } from "@/components/dashboard/new-ticket-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { getDashboardContext } from "@/lib/dashboard-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Neues Ticket" };

export default async function NewTicketPage() {
  const context = await getDashboardContext();

  // Admin und Team können Tickets für jede Organisation erfassen,
  // Organisationsaccounts nur für die eigenen.
  const organizations = context.staff
    ? await prisma.organization.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
        take: 500,
      })
    : context.organizations.map((org) => ({ id: org.id, name: org.name }));

  return (
    <>
      <PageHeader
        title="Neues Ticket"
        description="Wir helfen dir gerne weiter – beschreibe dein Anliegen."
        breadcrumbs={[{ href: "/dashboard/tickets", label: "Tickets" }, { label: "Neu" }]}
      />

      <NewTicketForm
        organizations={organizations}
        defaultOrganizationId={context.organization?.id}
      />
    </>
  );
}
