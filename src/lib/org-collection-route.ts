import type { ZodType, ZodTypeDef } from "zod";

import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requireOrgAccess } from "@/lib/rbac";
import { getSubscription, withinLimit } from "@/lib/subscription";
import type { FeatureKey } from "@/lib/constants";

/**
 * Minimale Schnittstelle, die alle betroffenen Prisma-Delegates erfüllen.
 * Die generierten Delegate-Typen sind pro Modell unterschiedlich, weshalb
 * an genau dieser Stelle einmalig konvertiert wird. Die Typsicherheit der
 * Eingaben bleibt durch das Zod-Schema gewährleistet.
 */
type Delegate = {
  create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
  update: (args: {
    where: { id: string };
    data: Record<string, unknown>;
  }) => Promise<{ id: string }>;
  delete: (args: { where: { id: string } }) => Promise<unknown>;
  findUnique: (args: {
    where: { id: string };
    select: { id: true; organizationId: true };
  }) => Promise<{ id: string; organizationId: string } | null>;
  count: (args: { where: { organizationId: string } }) => Promise<number>;
};

/**
 * Erzeugt Route Handler für organisationsgebundene Unterressourcen
 * (Sponsoren, Programmpunkte, FAQ, Downloads).
 *
 * Alle Varianten teilen dieselbe Sicherheitslogik:
 * Zugriff nur über eine gültige Membership beziehungsweise Admin/Team,
 * und ein Eintrag kann nie in eine fremde Organisation verschoben werden.
 */
export function createOrgCollectionRoutes<Output, Input>(config: {
  entity: string;
  action: string;
  delegate: (client: typeof prisma) => unknown;
  schema: ZodType<Output, ZodTypeDef, Input>;
  /** Optionales tarifabhängiges Limit. */
  featureKey?: FeatureKey;
}) {
  const delegate = () => config.delegate(prisma) as Delegate;

  async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
    try {
      const { id: organizationId } = await ctx.params;
      const access = await requireOrgAccess(organizationId, { write: true });
      const body = await parseBody(request, config.schema);

      if (config.featureKey && !access.viaStaff) {
        const [subscription, count] = await Promise.all([
          getSubscription(organizationId),
          delegate().count({ where: { organizationId } }),
        ]);
        const check = withinLimit(subscription, config.featureKey, count);
        if (!check.allowed) return jsonError(check.reason ?? "Limit erreicht.", 403);
      }

      const created = await delegate().create({
        data: { ...(body as Record<string, unknown>), organizationId },
      });

      await logAudit({
        userId: access.user.id,
        userLabel: access.user.email,
        action: `${config.action}.create`,
        entity: config.entity,
        entityId: created.id,
        after: body as Record<string, unknown>,
      });

      return jsonOk(created, 201);
    } catch (error) {
      return handleApiError(error);
    }
  }

  async function PATCH(
    request: Request,
    ctx: { params: Promise<{ id: string; itemId: string }> },
  ) {
    try {
      const { id: organizationId, itemId } = await ctx.params;
      const access = await requireOrgAccess(organizationId, { write: true });

      const existing = await delegate().findUnique({
        where: { id: itemId },
        select: { id: true, organizationId: true },
      });
      // Verhindert das Bearbeiten von Einträgen fremder Organisationen.
      if (!existing || existing.organizationId !== organizationId) {
        return jsonError("Eintrag nicht gefunden.", 404);
      }

      const body = await parseBody(request, config.schema);

      const updated = await delegate().update({
        where: { id: itemId },
        data: body as Record<string, unknown>,
      });

      await logAudit({
        userId: access.user.id,
        userLabel: access.user.email,
        action: `${config.action}.update`,
        entity: config.entity,
        entityId: itemId,
        after: body as Record<string, unknown>,
      });

      return jsonOk(updated);
    } catch (error) {
      return handleApiError(error);
    }
  }

  async function DELETE(
    _request: Request,
    ctx: { params: Promise<{ id: string; itemId: string }> },
  ) {
    try {
      const { id: organizationId, itemId } = await ctx.params;
      const access = await requireOrgAccess(organizationId, { write: true });

      const existing = await delegate().findUnique({
        where: { id: itemId },
        select: { id: true, organizationId: true },
      });
      if (!existing || existing.organizationId !== organizationId) {
        return jsonError("Eintrag nicht gefunden.", 404);
      }

      await delegate().delete({ where: { id: itemId } });

      await logAudit({
        userId: access.user.id,
        userLabel: access.user.email,
        action: `${config.action}.delete`,
        entity: config.entity,
        entityId: itemId,
      });

      return jsonOk({ ok: true });
    } catch (error) {
      return handleApiError(error);
    }
  }

  return { POST, PATCH, DELETE };
}
