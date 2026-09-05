import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { TicketBadge } from "@/components/dashboard/status-badge";
import { TicketThread } from "@/components/dashboard/ticket-thread";
import { requirePermissionPage } from "@/lib/dashboard-context";
import { formatDateTime } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Kontaktanfrage" };

type Params = { params: Promise<{ id: string }> };

/**
 * Eine einzelne Kontaktanfrage.
 *
 * Der Verlauf und die Statusänderung stammen aus dem Ticket-System – dieselbe
 * Komponente wie unter Tickets, dieselben Endpunkte. Neu ist nur der Kopf mit
 * den Angaben des Formulars, die im Ticket sonst über mehrere Felder verteilt
 * sind, und die Einordnung in diesen Bereich.
 */
export default async function ContactRequestDetailPage({ params }: Params) {
  const { id } = await params;
  await requirePermissionPage("handleContactRequests");

  // Die Kategorie steht in der Bedingung: Ein gewöhnliches Ticket lässt sich
  // über diese Adresse nicht öffnen.
  const anfrage = await prisma.ticket.findFirst({
    where: { id, category: "CONTACT" },
    include: {
      author: { select: { id: true, name: true, email: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true, role: true } } },
      },
    },
  });

  if (!anfrage) notFound();

  const name = anfrage.guestName ?? anfrage.author?.name ?? "Unbekannt";
  const email = anfrage.guestEmail ?? anfrage.author?.email ?? null;

  return (
    <>
      <PageHeader
        title={anfrage.subject}
        breadcrumbs={[
          { href: "/dashboard/kontaktanfragen", label: "Kontaktanfragen" },
          { label: `#${anfrage.number}` },
        ]}
        actions={<TicketBadge status={anfrage.status} />}
      />

      <Card className="mb-6 p-5">
        <h2 className="mb-4 font-display text-base font-semibold">Angaben aus dem Formular</h2>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Name</dt>
            <dd className="mt-0.5 font-medium">{name}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">E-Mail</dt>
            <dd className="mt-0.5 break-all">
              {email ? (
                <a href={`mailto:${email}`} className="text-primary-800 hover:underline">
                  {email}
                </a>
              ) : (
                "–"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Betreff</dt>
            <dd className="mt-0.5">{anfrage.subject}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Eingang</dt>
            <dd className="mt-0.5">{formatDateTime(anfrage.createdAt)}</dd>
          </div>
        </dl>
      </Card>

      <TicketThread
        ticketId={anfrage.id}
        messages={anfrage.messages}
        status={anfrage.status}
        priority={anfrage.priority}
        isStaff
        closed={anfrage.status === "CLOSED"}
      />
    </>
  );
}
