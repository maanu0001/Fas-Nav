import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { MembershipRole, OrganizationType, Role } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  can,
  isAdmin,
  isStaff,
  type OrgCapability,
  type PermissionKey,
} from "@/lib/rbac";
import { getSubscription, type SubscriptionWithPlan } from "@/lib/subscription";

/** Name des Cookies, in dem die aktive Organisation gemerkt wird. */
export const ACTIVE_ORG_COOKIE = "fasnav_org";

export type DashboardOrganization = {
  id: string;
  name: string;
  slug: string;
  type: OrganizationType;
  status: string;
  verification: string;
  claimStatus: string;
  onboardingCompleted: boolean;
  membershipRole: MembershipRole;
};

export type DashboardContext = {
  user: { id: string; name: string; email: string; role: string };
  staff: boolean;
  /** Aktuell ausgewählte Organisation eines Organisationskontos. */
  organization: DashboardOrganization | null;
  /** Alle Organisationen, auf die das Konto Zugriff hat. */
  organizations: DashboardOrganization[];
  subscription: SubscriptionWithPlan | null;
  /** Fähigkeiten in der aktiven Organisation. */
  capabilities: OrgCapability[];
  can: (capability: OrgCapability) => boolean;
};

/**
 * Lädt den gemeinsamen Kontext für alle Dashboard-Seiten.
 * Leitet nicht angemeldete oder deaktivierte Benutzer zur Anmeldung um.
 *
 * Für Organisationsaccounts wird hier die zugewiesene Organisation ermittelt;
 * jede weitere Abfrage arbeitet ausschliesslich mit dieser ID.
 */
export async function getDashboardContext(): Promise<DashboardContext> {
  const session = await auth();

  if (!session?.user?.id) redirect("/login");
  if (!session.user.isActive) redirect("/login?error=inactive");

  const staff = isStaff(session.user.role);

  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: {
      role: true,
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          status: true,
          verification: true,
          claimStatus: true,
          onboardingCompleted: true,
        },
      },
    },
  });

  const organizations: DashboardOrganization[] = memberships.map((m) => ({
    ...m.organization,
    membershipRole: m.role,
  }));

  // Aktive Organisation aus dem Cookie – aber nur, wenn dafür tatsächlich
  // eine Zuweisung besteht. Ein manipuliertes Cookie kann damit keinen
  // Zugriff auf eine fremde Organisation herstellen.
  const cookieStore = await cookies();
  const preferredId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
  const organization =
    organizations.find((org) => org.id === preferredId) ?? organizations[0] ?? null;

  const subscription = organization ? await getSubscription(organization.id) : null;

  const capabilities: OrgCapability[] = staff
    ? ["view", "edit", "manage", "manageMembers"]
    : organization
      ? ORG_CAPABILITIES_BY_ROLE[organization.membershipRole]
      : [];

  return {
    user: {
      id: session.user.id,
      name: session.user.name ?? session.user.email ?? "Benutzer",
      email: session.user.email ?? "",
      role: session.user.role,
    },
    staff,
    organization,
    organizations,
    subscription,
    capabilities,
    can: (capability) => capabilities.includes(capability),
  };
}

/**
 * Fähigkeiten je organisationsinterner Rolle.
 * Spiegelt die verbindliche Definition in `src/lib/rbac.ts` für die
 * Darstellung im Dashboard; durchgesetzt wird sie serverseitig dort.
 */
const ORG_CAPABILITIES_BY_ROLE: Record<MembershipRole, OrgCapability[]> = {
  OWNER: ["view", "edit", "manage", "manageMembers"],
  MANAGER: ["view", "edit", "manage"],
  EDITOR: ["view", "edit"],
};

/**
 * Erzwingt eine zugeordnete Organisation.
 * Verhindert, dass ein Organisationsaccount ohne Zuweisung ins Leere läuft.
 */
export async function requireOrganizationContext() {
  const context = await getDashboardContext();

  if (!context.organization) {
    if (context.staff) redirect("/dashboard/organisationen");
    redirect("/dashboard/keine-organisation");
  }

  return { ...context, organization: context.organization };
}

/**
 * Seiten-Guards für Dashboard-Routen.
 *
 * Im Gegensatz zu den API-Guards werfen sie keine Ausnahme, sondern leiten
 * auf eine verständliche Hinweisseite um. Die verbindliche Rechteprüfung
 * findet weiterhin in jedem API-Endpoint statt.
 */
const DENIED = "/dashboard/kein-zugriff";

export async function requireStaffPage(): Promise<DashboardContext> {
  const context = await getDashboardContext();
  if (!context.staff) redirect(DENIED);
  return context;
}

export async function requireAdminPage(): Promise<DashboardContext> {
  const context = await getDashboardContext();
  if (!isAdmin(context.user.role as Role)) redirect(DENIED);
  return context;
}

export async function requirePermissionPage(
  permission: PermissionKey,
): Promise<DashboardContext> {
  const context = await getDashboardContext();
  if (!can(context.user.role as Role, permission)) redirect(DENIED);
  return context;
}
