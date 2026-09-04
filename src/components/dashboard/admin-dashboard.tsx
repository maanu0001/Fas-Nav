import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { StatCard, StatGrid } from "@/components/dashboard/stat-card";
import { EmptyState } from "@/components/ui/states";
import {
  SUBSCRIPTION_EXPIRY_WARNING_DAYS,
  TICKET_STATUS_LABELS,
} from "@/lib/constants";
import type { DashboardContext } from "@/lib/dashboard-context";
import { formatDateShort, relativeTime, startOfToday } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { can, isAdmin } from "@/lib/rbac";
import { formatChf } from "@/lib/utils";
import type { Role } from "@prisma/client";

export async function AdminDashboard({ context }: { context: DashboardContext }) {
  const today = startOfToday();
  const soon = new Date(Date.now() + SUBSCRIPTION_EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const role = context.user.role as Role;
  // Abonnement- und Zahlungszahlen sind kaufmännische Angaben. Sie werden für
  // Konten ohne dieses Recht gar nicht erst abgefragt und erreichen den Client
  // damit auch nicht als Beiwerk.
  const showFinancials = can(role, "viewFinancialFigures");

  const [
    carnivals,
    guggen,
    activeAccounts,
    newAccounts,
    openTickets,
    upcomingEvents,
    activeSubscriptions,
    expiringSubscriptions,
    openPayments,
    draftOrganizations,
    recentTickets,
    recentLogs,
  ] = await Promise.all([
    prisma.organization.count({ where: { type: "CARNIVAL" } }),
    prisma.organization.count({ where: { type: "GUGGE" } }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
    prisma.ticket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.event.count({ where: { startDate: { gte: today }, status: "PUBLISHED" } }),
    showFinancials ? prisma.subscription.count({ where: { status: "ACTIVE" } }) : 0,
    showFinancials
      ? prisma.subscription.count({
          where: { status: { in: ["ACTIVE", "TRIAL"] }, endDate: { gte: today, lte: soon } },
        })
      : 0,
    showFinancials
      ? prisma.payment.aggregate({
          where: { status: "PENDING" },
          _sum: { amountChf: true },
          _count: true,
        })
      : null,
    prisma.organization.count({ where: { status: { in: ["DRAFT", "PENDING_REVIEW"] } } }),
    prisma.ticket.findMany({
      where: { status: { in: ["OPEN", "IN_PROGRESS", "WAITING_FOR_CUSTOMER"] } },
      orderBy: { lastReplyAt: "desc" },
      take: 6,
      select: {
        id: true,
        number: true,
        subject: true,
        status: true,
        lastReplyAt: true,
        organization: { select: { name: true } },
        guestName: true,
      },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        action: true,
        entity: true,
        entityLabel: true,
        userLabel: true,
        createdAt: true,
      },
    }),
  ]);


  return (
    <>
      <PageHeader
        title={`Willkommen, ${context.user.name.split(" ")[0]}`}
        description="Überblick über Organisationen, Abonnemente und den Support."
      />

      <section className="mb-8" aria-label="Schnellaktionen">
        <QuickActions
          actions={[
            {
              href: "/dashboard/organisationen/neu?typ=CARNIVAL",
              label: "Fasnacht erstellen",
              description: "Neues Profil anlegen",
              icon: "building",
            },
            {
              href: "/dashboard/organisationen/neu?typ=GUGGE",
              label: "Gugge erstellen",
              description: "Neues Profil anlegen",
              icon: "building",
            },
            ...(isAdmin(role)
              ? [
                  {
                    href: "/dashboard/accounts/neu",
                    label: "Account erstellen",
                    description: "Zugang vergeben",
                    icon: "users",
                  },
                ]
              : []),
            {
              href: "/dashboard/tickets",
              label: "Tickets öffnen",
              description: `${openTickets} offen`,
              icon: "ticket",
            },
          ]}
        />
      </section>

      {/*
        Ohne die kaufmännischen Kacheln bleibt für die zweite Reihe nur eine
        einzelne Kachel übrig. Sie wandert dann in die erste Reihe, damit kein
        Abschnitt mit einer einsamen Kachel und keine leere Rasterzelle
        entsteht. Das Raster selbst passt die Spaltenzahl an (siehe StatGrid).
      */}
      <section className="mb-8" aria-label="Kennzahlen">
        <StatGrid>
          <StatCard
            label="Fasnachten"
            value={carnivals}
            icon="building"
            href="/dashboard/organisationen?typ=CARNIVAL"
          />
          <StatCard
            label="Guggen"
            value={guggen}
            icon="building"
            href="/dashboard/organisationen?typ=GUGGE"
          />
          <StatCard
            label="Aktive Accounts"
            value={activeAccounts}
            hint={`${newAccounts} neu in 30 Tagen`}
            icon="users"
            href="/dashboard/accounts"
          />
          <StatCard
            label="Offene Tickets"
            value={openTickets}
            icon="ticket"
            href="/dashboard/tickets"
            tone={openTickets > 0 ? "warning" : "default"}
          />
          {showFinancials ? null : (
            <StatCard
              label="Kommende Veranstaltungen"
              value={upcomingEvents}
              icon="calendar"
              href="/dashboard/agenda"
            />
          )}
        </StatGrid>
      </section>

      {showFinancials && openPayments ? (
        <section className="mb-8" aria-label="Abonnemente und Zahlungen">
          <StatGrid>
            <StatCard
              label="Kommende Veranstaltungen"
              value={upcomingEvents}
              icon="calendar"
              href="/dashboard/agenda"
            />
            <StatCard
              label="Aktive Abonnemente"
              value={activeSubscriptions}
              icon="badge"
              href="/dashboard/abonnemente"
            />
            <StatCard
              label="Laufen bald ab"
              value={expiringSubscriptions}
              hint={`in den nächsten ${SUBSCRIPTION_EXPIRY_WARNING_DAYS} Tagen`}
              icon="badge"
              href="/dashboard/abonnemente?filter=expiring"
              tone={expiringSubscriptions > 0 ? "warning" : "default"}
            />
            <StatCard
              label="Offene Zahlungen"
              value={formatChf(Number(openPayments._sum.amountChf ?? 0))}
              hint={`${openPayments._count} Rechnung(en)`}
              icon="wallet"
              href="/dashboard/zahlungen?status=PENDING"
              tone={openPayments._count > 0 ? "warning" : "default"}
            />
          </StatGrid>
        </section>
      ) : null}

      {draftOrganizations > 0 ? (
        <Card className="mb-8 border-amber-200 bg-amber-50 p-5">
          <p className="text-sm text-amber-900">
            <strong>{draftOrganizations}</strong>{" "}
            {draftOrganizations === 1 ? "Organisation ist" : "Organisationen sind"} noch nicht
            veröffentlicht.{" "}
            <Link href="/dashboard/organisationen?status=DRAFT" className="font-medium underline">
              Jetzt prüfen
            </Link>
          </p>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-base font-semibold">Aktuelle Tickets</h2>
            <Link href="/dashboard/tickets" className="text-sm text-primary-700 hover:underline">
              Alle anzeigen
            </Link>
          </div>

          {recentTickets.length ? (
            <ul className="divide-y divide-border">
              {recentTickets.map((ticket) => (
                <li key={ticket.id}>
                  <Link
                    href={`/dashboard/tickets/${ticket.id}`}
                    className="flex items-start justify-between gap-3 py-2.5 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-primary-900">
                        #{ticket.number} {ticket.subject}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {ticket.organization?.name ?? ticket.guestName ?? "Ohne Organisation"} ·{" "}
                        {relativeTime(ticket.lastReplyAt)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        ticket.status === "OPEN"
                          ? "warning"
                          : ticket.status === "IN_PROGRESS"
                            ? "info"
                            : "muted"
                      }
                    >
                      {TICKET_STATUS_LABELS[ticket.status]}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Keine offenen Tickets" description="Alles erledigt." />
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-base font-semibold">Plattformaktivität</h2>
            <Link href="/dashboard/logs" className="text-sm text-primary-700 hover:underline">
              Alle Logs
            </Link>
          </div>

          {recentLogs.length ? (
            <ul className="divide-y divide-border">
              {recentLogs.map((log) => (
                <li key={log.id} className="py-2.5">
                  <p className="text-sm text-slate-700">
                    <span className="font-medium text-primary-900">{log.action}</span>
                    {log.entityLabel ? ` · ${log.entityLabel}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {log.userLabel ?? "System"} · {formatDateShort(log.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Noch keine Aktivität" description="Änderungen erscheinen hier." />
          )}
        </Card>
      </div>
    </>
  );
}
