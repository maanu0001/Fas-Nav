import { z } from "zod";

import { trackView, visitorHash } from "@/lib/analytics";
import { jsonOk, parseBody, route } from "@/lib/api";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const trackSchema = z.object({
  target: z.enum(["ORGANIZATION", "EVENT", "HOMEPAGE", "CANTON", "SEARCH"]).default("ORGANIZATION"),
  interaction: z
    .enum(["VIEW", "WEBSITE_CLICK", "SOCIAL_CLICK", "TICKET_CLICK", "CONTACT_CLICK"])
    .default("VIEW"),
  organizationId: z.string().max(40).optional(),
  eventId: z.string().max(40).optional(),
  path: z.string().max(300).default("/"),
  meta: z.string().max(200).optional(),
});

/**
 * Nimmt anonyme Aufruf- und Klickmeldungen entgegen.
 * Es werden keine IP-Adressen im Klartext gespeichert (CH-DSG).
 */
export const POST = route(async (request) => {
  const limit = checkRateLimit(clientKey(request, "track"), 120, 60_000);
  if (!limit.ok) {
    // Bei Überschreitung still verwerfen – Tracking darf nie stören.
    return jsonOk({ ok: true });
  }

  const body = await parseBody(request, trackSchema);

  // Nur existierende Referenzen zählen; erfundene IDs werden verworfen.
  if (body.organizationId) {
    const exists = await prisma.organization.findUnique({
      where: { id: body.organizationId },
      select: { id: true },
    });
    if (!exists) return jsonOk({ ok: true });
  }
  if (body.eventId) {
    const exists = await prisma.event.findUnique({
      where: { id: body.eventId },
      select: { id: true },
    });
    if (!exists) return jsonOk({ ok: true });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  await trackView({
    target: body.target,
    interaction: body.interaction,
    organizationId: body.organizationId,
    eventId: body.eventId,
    path: body.path,
    meta: body.meta,
    referrer: request.headers.get("referer"),
    visitorHash: visitorHash(ip, request.headers.get("user-agent")),
  });

  return jsonOk({ ok: true });
});
