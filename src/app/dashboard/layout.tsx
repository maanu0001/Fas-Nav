import type { Metadata } from "next";

import { DashboardShell } from "@/components/dashboard/sidebar";
import { MaintenanceScreen } from "@/components/maintenance/maintenance-screen";
import { getDashboardContext } from "@/lib/dashboard-context";
import { PUBLICATION_STATUS_LABELS, ROLE_LABELS } from "@/lib/constants";
import { maintenanceScreenFor } from "@/lib/maintenance";
import { dashboardNavigation } from "@/lib/navigation";
import { prisma } from "@/lib/prisma";
import { ticketScope } from "@/lib/queries/tickets";
import type { Role } from "@prisma/client";

// Das Dashboard ist immer benutzerbezogen und liest zudem den Wartungsmodus
// aus der Datenbank. Es darf deshalb nicht vorab gerendert werden.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s | Fas-Nav Dashboard" },
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Während der Wartung arbeitet nur die Administration weiter. Ein Login
  // allein hebt den Wartungsmodus also nicht auf.
  const maintenance = await maintenanceScreenFor();
  if (maintenance) return <MaintenanceScreen message={maintenance.message} />;

  const context = await getDashboardContext();
  const role = context.user.role as Role;

  const [unreadNotifications, openTickets] = await Promise.all([
    prisma.notification.count({ where: { userId: context.user.id, readAt: null } }),
    prisma.ticket.count({
      where: {
        AND: [
          await ticketScope({
            id: context.user.id,
            role,
            isActive: true,
            name: context.user.name,
            email: context.user.email,
          }),
          { status: { in: ["OPEN", "IN_PROGRESS", "WAITING_FOR_CUSTOMER"] } },
        ],
      },
    }),
  ]);

  return (
    <DashboardShell
      navigation={dashboardNavigation(role)}
      user={{
        name: context.user.name,
        email: context.user.email,
        roleLabel: ROLE_LABELS[role],
      }}
      organizations={
        context.organization
          ? {
              activeId: context.organization.id,
              items: context.organizations.map((org) => ({
                id: org.id,
                name: org.name,
                slug: org.slug,
                type: org.type,
                membershipRole: org.membershipRole,
                statusLabel:
                  PUBLICATION_STATUS_LABELS[
                    org.status as keyof typeof PUBLICATION_STATUS_LABELS
                  ] ?? org.status,
                published: org.status === "PUBLISHED",
              })),
            }
          : null
      }
      unreadNotifications={unreadNotifications}
      openTickets={openTickets}
    >
      {children}
    </DashboardShell>
  );
}
