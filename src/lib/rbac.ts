import type { MembershipRole, OrganizationType, Role } from "@prisma/client";
import type { Session } from "next-auth";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type SessionUser = Session["user"];

/** Rollen mit plattformweiten Rechten. */
export const STAFF_ROLES: Role[] = ["SUPERADMIN", "ADMIN", "TEAM"];
/** Rollen, die einer Organisation zugeordnet sind. */
export const ORG_ROLES: Role[] = ["FASNACHT", "GUGGE"];

export function isStaff(role: Role | undefined | null): boolean {
  return !!role && STAFF_ROLES.includes(role);
}

export function isAdmin(role: Role | undefined | null): boolean {
  return role === "ADMIN" || role === "SUPERADMIN";
}

export function isOrgRole(role: Role | undefined | null): boolean {
  return !!role && ORG_ROLES.includes(role);
}

/**
 * Zentrale Berechtigungsmatrix. Alle Prüfungen laufen serverseitig;
 * das Frontend blendet lediglich zusätzlich aus.
 */
export const PERMISSIONS = {
  /** Nur ADMIN/SUPERADMIN dürfen Team- und Adminaccounts verwalten. */
  manageStaffAccounts: (role: Role) => isAdmin(role),
  manageOrgAccounts: (role: Role) => isStaff(role),
  manageOrganizations: (role: Role) => isStaff(role),
  manageAllEvents: (role: Role) => isStaff(role),
  manageSubscriptions: (role: Role) => isStaff(role),
  managePayments: (role: Role) => isStaff(role),
  managePlans: (role: Role) => isAdmin(role),
  manageHomepage: (role: Role) => isStaff(role),
  manageSettings: (role: Role) => isAdmin(role),
  managePlacements: (role: Role) => isStaff(role),
  viewAllTickets: (role: Role) => isStaff(role),
  viewAuditLog: (role: Role) => isStaff(role),
  viewPlatformStats: (role: Role) => isStaff(role),
  verifyOrganizations: (role: Role) => isStaff(role),
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export function can(role: Role | undefined | null, permission: PermissionKey): boolean {
  if (!role) return false;
  return PERMISSIONS[permission](role);
}

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403 | 404,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/** Liefert den angemeldeten Benutzer oder wirft 401. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthError("Nicht angemeldet.", 401);
  }
  if (!session.user.isActive) {
    throw new AuthError("Dieses Konto ist deaktiviert.", 403);
  }
  return session.user;
}

/** Verlangt eine der angegebenen Rollen. */
export async function requireRole(roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new AuthError("Keine Berechtigung für diese Aktion.", 403);
  }
  return user;
}

export async function requireStaff(): Promise<SessionUser> {
  return requireRole(STAFF_ROLES);
}

export async function requireAdmin(): Promise<SessionUser> {
  return requireRole(["ADMIN", "SUPERADMIN"]);
}

export async function requirePermission(permission: PermissionKey): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user.role, permission)) {
    throw new AuthError("Keine Berechtigung für diese Aktion.", 403);
  }
  return user;
}

export type OrgAccess = {
  user: SessionUser;
  organizationId: string;
  /** true, wenn der Zugriff über eine Plattformrolle erfolgt. */
  viaStaff: boolean;
  membershipRole: MembershipRole | null;
};

/**
 * Kernstück der Mandantentrennung: Prüft, ob der angemeldete Benutzer
 * die angegebene Organisation bearbeiten darf.
 *
 * Ein FASNACHT- oder GUGGE-Account erhält Zugriff ausschliesslich über eine
 * Membership. Manipulierte IDs im Request führen zu 403 – niemals zu Zugriff
 * auf eine fremde Organisation.
 */
export async function requireOrgAccess(
  organizationId: string,
  options: { write?: boolean } = {},
): Promise<OrgAccess> {
  const user = await requireUser();

  if (isStaff(user.role)) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true },
    });
    if (!org) throw new AuthError("Organisation nicht gefunden.", 404);
    return { user, organizationId: org.id, viaStaff: true, membershipRole: null };
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId: user.id, organizationId } },
    select: { role: true },
  });

  if (!membership) {
    throw new AuthError("Keine Berechtigung für diese Organisation.", 403);
  }

  if (options.write && membership.role === "VIEWER") {
    throw new AuthError("Nur Lesezugriff auf diese Organisation.", 403);
  }

  return {
    user,
    organizationId,
    viaStaff: false,
    membershipRole: membership.role,
  };
}

/** Alle Organisationen, auf die der Benutzer Zugriff hat. */
export async function getUserOrganizations(userId: string) {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          status: true,
          verification: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  return memberships.map((m) => ({ ...m.organization, membershipRole: m.role }));
}

/** Primäre Organisation eines Organisationsaccounts. */
export async function getPrimaryOrganizationId(userId: string): Promise<string | null> {
  const membership = await prisma.membership.findFirst({
    where: { userId },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: { organizationId: true },
  });
  return membership?.organizationId ?? null;
}

/** Passende Rolle für einen neuen Organisationsaccount. */
export function roleForOrganizationType(type: OrganizationType): Role {
  return type === "CARNIVAL" ? "FASNACHT" : "GUGGE";
}
