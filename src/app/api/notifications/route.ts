import { z } from "zod";

import { handleApiError, jsonOk, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const markSchema = z.object({
  /** Ohne IDs werden alle eigenen Benachrichtigungen als gelesen markiert. */
  ids: z.array(z.string().max(40)).max(200).optional(),
});

/** Benachrichtigungen als gelesen markieren – stets nur die eigenen. */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseBody(request, markSchema);

    const result = await prisma.notification.updateMany({
      where: {
        userId: user.id,
        readAt: null,
        ...(body.ids?.length ? { id: { in: body.ids } } : {}),
      },
      data: { readAt: new Date() },
    });

    return jsonOk({ updated: result.count });
  } catch (error) {
    return handleApiError(error);
  }
}
