import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/dashboard/page-header";
import { PriorityBadge, TicketBadge } from "@/components/dashboard/status-badge";
import { TicketThread } from "@/components/dashboard/ticket-thread";
import { TICKET_CATEGORY_LABELS } from "@/lib/constants";
import { getDashboardContext } from "@/lib/dashboard-context";
import { formatDateTime } from "@/lib/dates";
import { getVisibleTicket } from "@/lib/queries/tickets";
import type { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Ticket" };

export default async function TicketDetailPage({ params }: Params) {
  const { id } = await params;
  const context = await getDashboardContext();

  // Liefert null, wenn das Ticket nicht zum Benutzer gehört.
  const ticket = await getVisibleTicket(id, {
    id: context.user.id,
    role: context.user.role as Role,
    isActive: true,
    name: context.user.name,
    email: context.user.email,
  });

  if (!ticket) notFound();

  return (
    <>
      <PageHeader
        title={`#${ticket.number} ${ticket.subject}`}
        description={`${TICKET_CATEGORY_LABELS[ticket.category]} · erstellt am ${formatDateTime(ticket.createdAt)}${
          ticket.organization ? ` · ${ticket.organization.name}` : ""
        }`}
        breadcrumbs={[{ href: "/dashboard/tickets", label: "Tickets" }, { label: `#${ticket.number}` }]}
        actions={
          <div className="flex items-center gap-2">
            <PriorityBadge priority={ticket.priority} />
            <TicketBadge status={ticket.status} />
          </div>
        }
      />

      <TicketThread
        ticketId={ticket.id}
        messages={ticket.messages}
        status={ticket.status}
        priority={ticket.priority}
        isStaff={context.staff}
        closed={ticket.status === "CLOSED"}
      />
    </>
  );
}
