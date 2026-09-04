import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck } from "lucide-react";

import { Table, TableWrapper, Td, Th, Thead, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { DashboardFilters } from "@/components/dashboard/filter-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard, StatGrid } from "@/components/dashboard/stat-card";
import { SubscriptionBadge } from "@/components/dashboard/status-badge";
import { SUBSCRIPTION_EXPIRY_WARNING_DAYS, SUBSCRIPTION_STATUS_LABELS } from "@/lib/constants";
import { formatDateShort, startOfToday } from "@/lib/dates";
import { requirePermissionPage } from "@/lib/dashboard-context";
import { prisma } from "@/lib/prisma";

import { daysUntilExpiry } from "@/lib/subscription";
import { formatChf } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Abonnemente" };

type SearchParams = Promise<Record<string, string | undefined>>;

export default async function SubscriptionsPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermissionPage("manageSubscriptions");
  const params = await searchParams;

  const today = startOfToday();
  const soon = new Date(Date.now() + SUBSCRIPTION_EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000);

  const where: Prisma.SubscriptionWhereInput = {
    ...(params.status ? { status: params.status as never } : {}),
    ...(params.filter === "expiring"
      ? { endDate: { gte: today, lte: soon }, status: { in: ["ACTIVE", "TRIAL"] } }
      : {}),
    ...(params.filter === "expired" ? { endDate: { lt: today } } : {}),
    ...(params.tarif ? { plan: { key: params.tarif } } : {}),
    ...(params.q
      ? { organization: { name: { contains: params.q, mode: "insensitive" } } }
      : {}),
  };

  const [subscriptions, plans, counts, revenue] = await Promise.all([
    prisma.subscription.findMany({
      where,
      orderBy: [{ endDate: "asc" }],
      take: 200,
      select: {
        id: true,
        status: true,
        priceChf: true,
        startDate: true,
        endDate: true,
        nextDueAt: true,
        autoRenew: true,
        plan: { select: { name: true } },
        organization: { select: { id: true, name: true, type: true, city: true } },
      },
    }),
    prisma.plan.findMany({ select: { key: true, name: true }, orderBy: { sortOrder: "asc" } }),
    prisma.subscription.groupBy({ by: ["status"], _count: { status: true } }),
    prisma.subscription.aggregate({ where: { status: "ACTIVE" }, _sum: { priceChf: true } }),
  ]);

  const countBy = (status: string) =>
    counts.find((c) => c.status === status)?._count.status ?? 0;

  const expiringCount = subscriptions.filter((s) => {
    const days = daysUntilExpiry(s.endDate);
    return days !== null && days >= 0 && days <= SUBSCRIPTION_EXPIRY_WARNING_DAYS;
  }).length;

  return (
    <>
      <PageHeader title="Abonnemente" description="Tarife, Laufzeiten und Zahlungsstatus." />

      <StatGrid>
        <StatCard label="Aktiv" value={countBy("ACTIVE")} icon="badge" tone="success" />
        <StatCard
          label="Laufen bald ab"
          value={expiringCount}
          hint={`in ${SUBSCRIPTION_EXPIRY_WARNING_DAYS} Tagen`}
          icon="badge"
          tone={expiringCount > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Zahlung ausstehend"
          value={countBy("PAYMENT_PENDING")}
          icon="wallet"
          tone={countBy("PAYMENT_PENDING") > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Jahresvolumen aktiv"
          value={formatChf(Number(revenue._sum.priceChf ?? 0))}
          icon="chart"
        />
      </StatGrid>

      <div className="mt-6">
        <DashboardFilters
          searchPlaceholder="Organisation suchen …"
          filters={[
            {
              name: "status",
              label: "Status",
              options: Object.entries(SUBSCRIPTION_STATUS_LABELS).map(([value, label]) => ({
                value,
                label,
              })),
            },
            {
              name: "tarif",
              label: "Tarif",
              options: plans.map((p) => ({ value: p.key, label: p.name })),
            },
            {
              name: "filter",
              label: "Ablauf",
              options: [
                { value: "expiring", label: "Läuft bald ab" },
                { value: "expired", label: "Abgelaufen" },
              ],
            },
          ]}
        />
      </div>

      {subscriptions.length ? (
        <TableWrapper>
          <Table>
            <Thead>
              <Tr>
                <Th>Organisation</Th>
                <Th>Tarif</Th>
                <Th>Preis</Th>
                <Th>Status</Th>
                <Th>Läuft bis</Th>
                <Th>Nächste Fälligkeit</Th>
                <Th>Verlängerung</Th>
              </Tr>
            </Thead>
            <tbody>
              {subscriptions.map((subscription) => {
                const days = daysUntilExpiry(subscription.endDate);
                const warning =
                  days !== null && days >= 0 && days <= SUBSCRIPTION_EXPIRY_WARNING_DAYS;

                return (
                  <Tr key={subscription.id}>
                    <Td>
                      <Link
                        href={`/dashboard/organisationen/${subscription.organization.id}`}
                        className="font-medium text-primary-800 hover:underline"
                      >
                        {subscription.organization.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {subscription.organization.type === "CARNIVAL" ? "Fasnacht" : "Gugge"} ·{" "}
                        {subscription.organization.city}
                      </p>
                    </Td>
                    <Td className="text-muted-foreground">{subscription.plan.name}</Td>
                    <Td className="whitespace-nowrap font-medium">
                      {formatChf(Number(subscription.priceChf))}
                    </Td>
                    <Td>
                      <SubscriptionBadge status={subscription.status} />
                    </Td>
                    <Td className="whitespace-nowrap">
                      {subscription.endDate ? (
                        <span className={warning ? "font-medium text-amber-700" : "text-muted-foreground"}>
                          {formatDateShort(subscription.endDate)}
                          {days !== null && days >= 0 ? (
                            <span className="block text-xs">noch {days} Tage</span>
                          ) : days !== null ? (
                            <span className="block text-xs text-red-700">abgelaufen</span>
                          ) : null}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">unbefristet</span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-muted-foreground">
                      {subscription.nextDueAt ? formatDateShort(subscription.nextDueAt) : "–"}
                    </Td>
                    <Td className="text-muted-foreground">
                      {subscription.autoRenew ? "Automatisch" : "Manuell"}
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </TableWrapper>
      ) : (
        <EmptyState
          icon={BadgeCheck}
          title="Keine Abonnemente gefunden"
          description="Abonnemente werden direkt auf der Organisationsseite eingerichtet."
        />
      )}
    </>
  );
}
