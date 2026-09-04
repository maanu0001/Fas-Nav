import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { syncClaimStatus } from "@/lib/claim-status";
import { notify } from "@/lib/notifications";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { requireOrganizationAccess, roleForOrganizationType } from "@/lib/rbac";
import { membershipCreateSchema, membershipInviteSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Listet alle Konten mit Zugriff auf diese Organisation. */
export async function GET(_request: Request, { params }: Params) {
  try {
    const { id: organizationId } = await params;
    await requireOrganizationAccess(organizationId, "manageMembers");

    const members = await prisma.membership.findMany({
      where: { organizationId },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        role: true,
        title: true,
        createdAt: true,
        user: {
          select: { id: true, name: true, email: true, isActive: true, lastLoginAt: true },
        },
      },
    });

    return jsonOk({ members });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Gewährt Zugriff auf diese Organisation.
 *
 * Zwei Betriebsarten:
 * - `userId` gesetzt: bestehendes Konto zuweisen.
 * - `email` gesetzt: neues Konto anlegen und direkt zuweisen.
 *
 * Beides erfordert die Berechtigung „Zugriffe verwalten“ für genau diese
 * Organisation. Andere Organisationen bleiben unberührt.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const { id: organizationId } = await params;
    const access = await requireOrganizationAccess(organizationId, "manageMembers");

    const raw = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!raw) return jsonError("Ungültiger Request-Body.", 400);

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, type: true, slug: true },
    });
    if (!organization) return jsonError("Organisation nicht gefunden.", 404);

    // --- Bestehendes Konto zuweisen -------------------------------------
    if (typeof raw.userId === "string" && raw.userId) {
      const body = membershipCreateSchema.parse(raw);

      const user = await prisma.user.findUnique({
        where: { id: body.userId },
        select: { id: true, name: true, email: true, role: true },
      });
      if (!user) {
        return jsonError("Dieses Benutzerkonto existiert nicht.", 404, {
          userId: "Dieses Benutzerkonto existiert nicht.",
        });
      }

      const existing = await prisma.membership.findUnique({
        where: { userId_organizationId: { userId: user.id, organizationId } },
        select: { id: true },
      });
      if (existing) {
        return jsonError("Dieses Konto hat bereits Zugriff auf diese Organisation.", 409);
      }

      const membership = await prisma.$transaction(async (tx) => {
        const created = await tx.membership.create({
          data: {
            userId: user.id,
            organizationId,
            role: body.role,
            title: body.title,
          },
          select: { id: true, role: true, title: true },
        });
        await syncClaimStatus(tx, organizationId);
        return created;
      });

      await logAudit({
        userId: access.user.id,
        userLabel: access.user.email,
        action: "membership.grant",
        entity: "Membership",
        entityId: membership.id,
        entityLabel: `${user.email} → ${organization.name}`,
        after: { role: membership.role, organizationId },
      });

      await notify({
        userId: user.id,
        organizationId,
        type: "SYSTEM",
        title: `Zugriff auf ${organization.name} erhalten`,
        body: "Du kannst diese Organisation ab sofort im Dashboard verwalten.",
        link: "/dashboard",
      });

      return jsonOk({ id: membership.id, userId: user.id, role: membership.role }, 201);
    }

    // --- Neues Konto anlegen und zuweisen --------------------------------
    const body = membershipInviteSchema.parse(raw);

    const taken = await prisma.user.findUnique({
      where: { email: body.email },
      select: { id: true },
    });
    if (taken) {
      return jsonError(
        "Diese E-Mail-Adresse wird bereits verwendet. Weise das bestehende Konto zu.",
        409,
        { email: "Diese E-Mail-Adresse wird bereits verwendet." },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: body.name,
          email: body.email,
          phone: body.phone,
          // Die globale Rolle spiegelt lediglich den Kontotyp; der Zugriff
          // ergibt sich ausschliesslich aus der Zuweisung unten.
          role: roleForOrganizationType(organization.type),
          passwordHash: body.password ? await hashPassword(body.password) : null,
          createdById: access.user.id,
        },
        select: { id: true, name: true, email: true },
      });

      const membership = await tx.membership.create({
        data: {
          userId: user.id,
          organizationId,
          role: body.role,
          title: body.title,
        },
        select: { id: true, role: true },
      });

      await syncClaimStatus(tx, organizationId);
      return { user, membership };
    });

    await logAudit({
      userId: access.user.id,
      userLabel: access.user.email,
      action: "membership.create_user",
      entity: "Membership",
      entityId: result.membership.id,
      entityLabel: `${result.user.email} → ${organization.name}`,
      after: { role: result.membership.role, organizationId },
    });

    await notify({
      userId: result.user.id,
      organizationId,
      type: "ACCOUNT_CREATED",
      title: "Willkommen bei Fas-Nav.ch",
      body: `Dein Konto wurde erstellt und ${organization.name} zugewiesen.`,
      link: "/dashboard",
    });

    return jsonOk(
      { id: result.membership.id, userId: result.user.id, role: result.membership.role },
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
