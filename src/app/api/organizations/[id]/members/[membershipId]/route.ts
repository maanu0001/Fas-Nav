import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { syncClaimStatus } from "@/lib/claim-status";
import { prisma } from "@/lib/prisma";
import { requireOrganizationAccess } from "@/lib/rbac";
import { membershipUpdateSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; membershipId: string }> };

/**
 * Lädt eine Zuweisung und stellt sicher, dass sie tatsächlich zu der
 * Organisation gehört, für die Zugriff geprüft wurde. Eine fremde
 * Membership-ID in der URL führt damit zu 404 statt zu einem Zugriff.
 */
async function loadMembership(organizationId: string, membershipId: string) {
  const membership = await prisma.membership.findUnique({
    where: { id: membershipId },
    select: {
      id: true,
      role: true,
      organizationId: true,
      user: { select: { id: true, email: true, name: true } },
      organization: { select: { id: true, name: true } },
    },
  });

  if (!membership || membership.organizationId !== organizationId) return null;
  return membership;
}

/** Berechtigung einer bestehenden Zuweisung ändern. */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id: organizationId, membershipId } = await params;
    const access = await requireOrganizationAccess(organizationId, "manageMembers");

    const membership = await loadMembership(organizationId, membershipId);
    if (!membership) return jsonError("Diese Zuweisung existiert nicht.", 404);

    const body = await parseBody(request, membershipUpdateSchema);

    // Die letzte Person mit Vollzugriff darf sich nicht selbst herabstufen –
    // sonst bliebe die Organisation ohne verwaltungsberechtigtes Konto zurück.
    if (body.role && body.role !== "OWNER" && membership.role === "OWNER") {
      const owners = await prisma.membership.count({
        where: { organizationId, role: "OWNER" },
      });
      if (owners <= 1 && !access.viaStaff) {
        return jsonError(
          "Es muss mindestens ein Konto mit Vollzugriff verbleiben.",
          409,
          { role: "Es muss mindestens ein Konto mit Vollzugriff verbleiben." },
        );
      }
    }

    const updated = await prisma.membership.update({
      where: { id: membershipId },
      data: {
        ...(body.role !== undefined ? { role: body.role } : {}),
        ...(body.title !== undefined ? { title: body.title } : {}),
      },
      select: { id: true, role: true, title: true },
    });

    await logAudit({
      userId: access.user.id,
      userLabel: access.user.email,
      action: "membership.update",
      entity: "Membership",
      entityId: membershipId,
      entityLabel: `${membership.user.email} → ${membership.organization.name}`,
      before: { role: membership.role },
      after: { role: updated.role },
    });

    return jsonOk(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Zugriff entziehen.
 *
 * Entfernt ausschliesslich die Zuweisung. Das Benutzerkonto bleibt bestehen
 * und behält seine Zugriffe auf andere Organisationen.
 */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id: organizationId, membershipId } = await params;
    const access = await requireOrganizationAccess(organizationId, "manageMembers");

    const membership = await loadMembership(organizationId, membershipId);
    if (!membership) return jsonError("Diese Zuweisung existiert nicht.", 404);

    // Ein Organisationskonto darf sich nicht selbst den Zugriff entziehen.
    if (!access.viaStaff && membership.user.id === access.user.id) {
      return jsonError("Du kannst dir den eigenen Zugriff nicht entziehen.", 409);
    }

    const claimStatus = await prisma.$transaction(async (tx) => {
      await tx.membership.delete({ where: { id: membershipId } });
      return syncClaimStatus(tx, organizationId);
    });

    await logAudit({
      userId: access.user.id,
      userLabel: access.user.email,
      action: "membership.revoke",
      entity: "Membership",
      entityId: membershipId,
      entityLabel: `${membership.user.email} → ${membership.organization.name}`,
      before: { role: membership.role, organizationId },
    });

    return jsonOk({
      ok: true,
      // Meldet der Oberfläche, wenn das Profil dadurch wieder als
      // „nicht beansprucht“ gilt.
      claimStatus,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
