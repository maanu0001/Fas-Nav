import { z } from "zod";

import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { FEATURE_KEYS } from "@/lib/constants";
import { processAndStoreImage, UploadError } from "@/lib/media";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireOrgAccess, requireUser, isStaff } from "@/lib/rbac";
import { getSubscription, withinLimit } from "@/lib/subscription";

export const dynamic = "force-dynamic";

const metaSchema = z.object({
  type: z.enum(["LOGO", "HEADER", "GALLERY", "SPONSOR", "EVENT", "HOMEPAGE", "DOCUMENT"]),
  organizationId: z.string().max(40).optional().nullable(),
  alt: z.string().max(200).optional().nullable(),
  caption: z.string().max(300).optional().nullable(),
});

/**
 * Bild-Upload. Organisationsaccounts dürfen ausschliesslich in ihre eigene
 * Organisation hochladen – die Zuordnung wird serverseitig erzwungen.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();

    const limit = checkRateLimit(`upload:${user.id}`, 40, 10 * 60_000);
    if (!limit.ok) {
      return jsonError("Zu viele Uploads. Bitte warte einen Moment.", 429);
    }

    const formData = await request.formData().catch(() => null);
    if (!formData) return jsonError("Ungültiger Upload.", 400);

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return jsonError("Es wurde keine Datei übermittelt.", 400);
    }

    const meta = metaSchema.parse({
      type: formData.get("type") ?? "GALLERY",
      organizationId: formData.get("organizationId") || null,
      alt: formData.get("alt") || null,
      caption: formData.get("caption") || null,
    });

    let organizationId: string | null = null;

    if (meta.organizationId) {
      // Wirft 403, sobald ein Account eine fremde Organisation angibt.
      const access = await requireOrgAccess(meta.organizationId, { write: true });
      organizationId = access.organizationId;

      // Galeriebilder sind an das Abonnement gebunden.
      if (meta.type === "GALLERY" && !access.viaStaff) {
        const [subscription, count] = await Promise.all([
          getSubscription(organizationId),
          prisma.media.count({ where: { organizationId, type: "GALLERY" } }),
        ]);
        const check = withinLimit(subscription, FEATURE_KEYS.GALLERY, count);
        if (!check.allowed) {
          return jsonError(check.reason ?? "Limit erreicht.", 403);
        }
      }
    } else if (!isStaff(user.role)) {
      // Ohne Organisationsbezug dürfen nur Admin und Team hochladen.
      return jsonError("Bitte wähle eine Organisation für diesen Upload.", 403);
    }

    const media = await processAndStoreImage({
      file,
      type: meta.type,
      organizationId,
      uploadedById: user.id,
      alt: meta.alt,
      caption: meta.caption,
    });

    await logAudit({
      userId: user.id,
      userLabel: user.email,
      action: "media.upload",
      entity: "Media",
      entityId: media.id,
      entityLabel: media.filename,
      after: { type: media.type, size: media.size, organizationId },
    });

    return jsonOk(
      {
        id: media.id,
        url: media.url,
        thumbnailUrl: media.thumbnailUrl,
        width: media.width,
        height: media.height,
        alt: media.alt,
        caption: media.caption,
        type: media.type,
        filename: media.filename,
      },
      201,
    );
  } catch (error) {
    if (error instanceof UploadError) {
      return jsonError(error.message, error.status);
    }
    return handleApiError(error);
  }
}

/** Listet Medien einer Organisation (Medienverwaltung). */
export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const organizationId = url.searchParams.get("organizationId");
    const type = url.searchParams.get("type");

    if (organizationId) {
      await requireOrgAccess(organizationId);
    } else if (!isStaff(user.role)) {
      return jsonError("Bitte gib eine Organisation an.", 403);
    }

    const media = await prisma.media.findMany({
      where: {
        ...(organizationId ? { organizationId } : {}),
        ...(type ? { type: type as never } : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: 200,
      select: {
        id: true,
        url: true,
        thumbnailUrl: true,
        filename: true,
        alt: true,
        caption: true,
        type: true,
        width: true,
        height: true,
        size: true,
        createdAt: true,
      },
    });

    return jsonOk({ media });
  } catch (error) {
    return handleApiError(error);
  }
}
