import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { planSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const actor = await requirePermission("managePlans");
    const body = await parseBody(request, planSchema.partial());

    const before = await prisma.plan.findUnique({
      where: { id },
      select: { id: true, key: true, name: true, priceChf: true, isActive: true },
    });
    if (!before) return jsonError("Tarif nicht gefunden.", 404);

    const { features, ...planData } = body;

    const plan = await prisma.$transaction(async (tx) => {
      const updated = await tx.plan.update({
        where: { id },
        data: planData,
        select: { id: true, key: true, name: true, priceChf: true, isActive: true },
      });

      // Die Funktionszuordnung wird als Ganzes ersetzt.
      if (features) {
        await tx.planFeature.deleteMany({ where: { planId: id } });
        if (features.length) {
          await tx.planFeature.createMany({
            data: features.map((f) => ({
              planId: id,
              featureId: f.featureId,
              enabled: f.enabled,
              limit: f.limit,
              note: f.note,
            })),
          });
        }
      }

      return updated;
    });

    await logAudit({
      userId: actor.id,
      userLabel: actor.email,
      action: "plan.update",
      entity: "Plan",
      entityId: id,
      entityLabel: plan.name,
      before,
      after: plan,
    });

    return jsonOk(plan);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const actor = await requirePermission("managePlans");

    const plan = await prisma.plan.findUnique({
      where: { id },
      select: { id: true, name: true, _count: { select: { subscriptions: true } } },
    });
    if (!plan) return jsonError("Tarif nicht gefunden.", 404);

    // Ein genutzter Tarif wird deaktiviert statt gelöscht, damit
    // bestehende Abonnements gültig bleiben.
    if (plan._count.subscriptions > 0) {
      await prisma.plan.update({ where: { id }, data: { isActive: false, isPublic: false } });
      await logAudit({
        userId: actor.id,
        userLabel: actor.email,
        action: "plan.deactivate",
        entity: "Plan",
        entityId: id,
        entityLabel: plan.name,
      });
      return jsonOk({
        ok: true,
        deactivated: true,
        message: `Der Tarif wird von ${plan._count.subscriptions} Abonnement(en) verwendet und wurde deaktiviert statt gelöscht.`,
      });
    }

    await prisma.plan.delete({ where: { id } });
    await logAudit({
      userId: actor.id,
      userLabel: actor.email,
      action: "plan.delete",
      entity: "Plan",
      entityId: id,
      entityLabel: plan.name,
    });

    return jsonOk({ ok: true, deactivated: false });
  } catch (error) {
    return handleApiError(error);
  }
}
