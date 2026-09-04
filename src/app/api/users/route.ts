import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLES, can, requirePermission } from "@/lib/rbac";
import { createUserSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

/**
 * Neuen Account erstellen.
 *
 * TEAM darf Organisationsaccounts anlegen, jedoch keine Team- oder
 * Adminaccounts – diese Einschränkung wird hier serverseitig durchgesetzt.
 */
export async function POST(request: Request) {
  try {
    const actor = await requirePermission("manageOrgAccounts");
    const body = await parseBody(request, createUserSchema);

    const targetsStaff = STAFF_ROLES.includes(body.role);
    if (targetsStaff && !can(actor.role, "manageStaffAccounts")) {
      return jsonError(
        "Team-Accounts dürfen ausschliesslich von Administratoren erstellt werden.",
        403,
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: body.email },
      select: { id: true },
    });
    if (existing) {
      return jsonError("Diese E-Mail-Adresse wird bereits verwendet.", 409, {
        email: "Diese E-Mail-Adresse wird bereits verwendet.",
      });
    }

    if (body.organizationId) {
      const org = await prisma.organization.findUnique({
        where: { id: body.organizationId },
        select: { id: true },
      });
      if (!org) {
        return jsonError("Die gewählte Organisation existiert nicht.", 422, {
          organizationId: "Die gewählte Organisation existiert nicht.",
        });
      }
    }

    const passwordHash = body.password ? await hashPassword(body.password) : null;

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        role: body.role,
        phone: body.phone,
        isActive: body.isActive,
        passwordHash,
        createdById: actor.id,
        ...(body.organizationId
          ? {
              memberships: {
                create: {
                  organizationId: body.organizationId,
                  role: body.membershipRole,
                },
              },
            }
          : {}),
      },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    // Ein neu verknüpftes Profil gilt damit als übernommen.
    if (body.organizationId) {
      await prisma.organization.update({
        where: { id: body.organizationId },
        data: { claimStatus: "CLAIMED" },
      });
    }

    await logAudit({
      userId: actor.id,
      userLabel: actor.email,
      action: "user.create",
      entity: "User",
      entityId: user.id,
      entityLabel: user.email,
      after: { role: user.role, organizationId: body.organizationId },
    });

    await notify({
      userId: user.id,
      type: "ACCOUNT_CREATED",
      title: "Willkommen bei Fas-Nav.ch",
      body: "Dein Konto wurde erstellt. Melde dich an, um deine Seite einzurichten.",
      link: "/dashboard",
    });

    return jsonOk(user, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
