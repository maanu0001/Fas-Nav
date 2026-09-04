import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { placementStatusEnum } from "@/lib/validation/schemas";
import { z } from "zod";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const updateSchema = z.object({ status: placementStatusEnum });

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const actor = await requirePermission("managePlacements");
    const body = await parseBody(request, updateSchema);

    const before = await prisma.placement.findUnique({
      where: { id },
      select: { id: true, type: true, status: true, organizationId: true, eventId: true, endDate: true },
    });
    if (!before) return jsonError("Platzierung nicht gefunden.", 404);

    const placement = await prisma.placement.update({
      where: { id },
      data: { status: body.status },
      select: { id: true, type: true, status: true },
    });

    const active = body.status === "ACTIVE";
    if (before.organizationId) {
      await prisma.organization.update({
        where: { id: before.organizationId },
        data: { isFeatured: active, featuredUntil: active ? before.endDate : null },
      });
    }
    if (before.eventId) {
      await prisma.event.update({
        where: { id: before.eventId },
        data: { isFeatured: active, featuredUntil: active ? before.endDate : null },
      });
    }

    await logAudit({
      userId: actor.id,
      userLabel: actor.email,
      action: "placement.update",
      entity: "Placement",
      entityId: id,
      entityLabel: placement.type,
      before: { status: before.status },
      after: { status: placement.status },
    });

    return jsonOk(placement);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const actor = await requirePermission("managePlacements");

    const before = await prisma.placement.findUnique({
      where: { id },
      select: { id: true, type: true, organizationId: true, eventId: true },
    });
    if (!before) return jsonError("Platzierung nicht gefunden.", 404);

    await prisma.placement.delete({ where: { id } });

    // Hervorhebung zurücknehmen, sofern keine andere aktive Platzierung besteht.
    if (before.organizationId) {
      const remaining = await prisma.placement.count({
        where: { organizationId: before.organizationId, status: "ACTIVE" },
      });
      if (remaining === 0) {
        await prisma.organization.update({
          where: { id: before.organizationId },
          data: { isFeatured: false, featuredUntil: null },
        });
      }
    }
    if (before.eventId) {
      const remaining = await prisma.placement.count({
        where: { eventId: before.eventId, status: "ACTIVE" },
      });
      if (remaining === 0) {
        await prisma.event.update({
          where: { id: before.eventId },
          data: { isFeatured: false, featuredUntil: null },
        });
      }
    }

    await logAudit({
      userId: actor.id,
      userLabel: actor.email,
      action: "placement.delete",
      entity: "Placement",
      entityId: id,
      entityLabel: before.type,
    });

    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
