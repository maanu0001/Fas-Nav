import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { FEATURE_KEYS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { requireOrganizationAccess, requireUser } from "@/lib/rbac";
import { uniqueEventSlug } from "@/lib/slug-service";
import { getSubscription, withinLimit } from "@/lib/subscription";
import { eventCreateSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

/**
 * Neue Veranstaltung anlegen.
 * Die Organisation wird aus dem Body gelesen und sofort gegen die
 * Berechtigungen des Benutzers geprüft – fremde IDs führen zu 403.
 */
export async function POST(request: Request) {
  try {
    // Authentifizierung vor der Validierung: Anonyme Aufrufe erhalten 401
    // und keine Rückschlüsse auf das erwartete Schema.
    await requireUser();

    const body = await parseBody(request, eventCreateSchema);
    const access = await requireOrganizationAccess(
      body.organizationId,
      // Ein direkt veröffentlichter Termin ist öffentlich wirksam.
      body.status === "PUBLISHED" ? "manage" : "edit",
    );

    // Anzahl Veranstaltungen ist tarifabhängig.
    if (!access.viaStaff) {
      const [subscription, count] = await Promise.all([
        getSubscription(body.organizationId),
        prisma.event.count({ where: { organizationId: body.organizationId } }),
      ]);
      const check = withinLimit(subscription, FEATURE_KEYS.EVENTS, count);
      if (!check.allowed) {
        return jsonError(check.reason ?? "Limit erreicht.", 403);
      }
    }

    // Ein Bild darf nur verwendet werden, wenn es der Organisation gehört.
    if (body.imageId) {
      const media = await prisma.media.findUnique({
        where: { id: body.imageId },
        select: { organizationId: true },
      });
      if (!media || (media.organizationId && media.organizationId !== body.organizationId)) {
        return jsonError("Das ausgewählte Bild gehört nicht zu dieser Organisation.", 403);
      }
    }

    const slug = await uniqueEventSlug(body.title, {
      preferred: body.slug,
      city: body.city,
      year: body.startDate.getFullYear(),
    });

    const event = await prisma.event.create({
      data: {
        organizationId: body.organizationId,
        title: body.title,
        slug,
        type: body.type,
        shortDescription: body.shortDescription,
        description: body.description,
        startDate: body.startDate,
        endDate: body.endDate,
        allDay: body.allDay,
        venueName: body.venueName,
        street: body.street,
        city: body.city,
        zip: body.zip,
        cantonId: body.cantonId,
        municipalityId: body.municipalityId,
        organizerName: body.organizerName,
        externalUrl: body.externalUrl,
        ticketUrl: body.ticketUrl,
        price: body.price,
        priceInfo: body.priceInfo,
        imageId: body.imageId,
        metaTitle: body.metaTitle,
        metaDesc: body.metaDesc,
        status: body.status,
        publishedAt: body.status === "PUBLISHED" ? new Date() : null,
      },
      select: { id: true, title: true, slug: true, status: true, startDate: true },
    });

    await logAudit({
      userId: access.user.id,
      userLabel: access.user.email,
      action: "event.create",
      entity: "Event",
      entityId: event.id,
      entityLabel: event.title,
      after: event,
    });

    return jsonOk(event, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
