import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLES, can, requirePermission } from "@/lib/rbac";
import { updateUserSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const actor = await requirePermission("manageOrgAccounts");
    const body = await parseBody(request, updateUserSchema);

    const before = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    if (!before) return jsonError("Benutzer nicht gefunden.", 404);

    const manageStaff = can(actor.role, "manageStaffAccounts");

    // TEAM darf weder Staff-Accounts verändern noch Rollen hochstufen.
    if (STAFF_ROLES.includes(before.role) && !manageStaff) {
      return jsonError("Team-Accounts dürfen nur von Administratoren bearbeitet werden.", 403);
    }
    if (body.role && STAFF_ROLES.includes(body.role) && !manageStaff) {
      return jsonError("Diese Rolle darf nur ein Administrator vergeben.", 403);
    }

    // Der eigene Account darf nicht selbst deaktiviert oder herabgestuft werden.
    if (actor.id === id) {
      if (body.isActive === false) {
        return jsonError("Du kannst dein eigenes Konto nicht deaktivieren.", 409);
      }
      if (body.role && body.role !== before.role) {
        return jsonError("Du kannst deine eigene Rolle nicht ändern.", 409);
      }
    }

    if (body.email && body.email !== before.email) {
      const taken = await prisma.user.findUnique({
        where: { email: body.email },
        select: { id: true },
      });
      if (taken) {
        return jsonError("Diese E-Mail-Adresse wird bereits verwendet.", 409, {
          email: "Diese E-Mail-Adresse wird bereits verwendet.",
        });
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: body,
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    await logAudit({
      userId: actor.id,
      userLabel: actor.email,
      action: body.isActive === false ? "user.deactivate" : "user.update",
      entity: "User",
      entityId: id,
      entityLabel: user.email,
      before,
      after: user,
    });

    return jsonOk(user);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const actor = await requirePermission("manageStaffAccounts");

    if (actor.id === id) {
      return jsonError("Du kannst dein eigenes Konto nicht löschen.", 409);
    }

    const before = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true },
    });
    if (!before) return jsonError("Benutzer nicht gefunden.", 404);

    await prisma.user.delete({ where: { id } });

    await logAudit({
      userId: actor.id,
      userLabel: actor.email,
      action: "user.delete",
      entity: "User",
      entityId: id,
      entityLabel: before.email,
      before,
    });

    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
