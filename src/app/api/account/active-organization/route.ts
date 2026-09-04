import { cookies } from "next/headers";
import { z } from "zod";

import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { ACTIVE_ORG_COOKIE } from "@/lib/dashboard-context";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const schema = z.object({ organizationId: z.string().min(1).max(40) });

/**
 * Wechselt die aktive Organisation eines Kontos mit mehreren Zuweisungen.
 *
 * Der Wechsel wird nur gespeichert, wenn für die Zielorganisation tatsächlich
 * eine Zuweisung besteht. Das Cookie ist damit lediglich eine Merkhilfe und
 * niemals selbst die Grundlage einer Berechtigung – jede Datenabfrage prüft
 * den Zugriff erneut serverseitig.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { organizationId } = await parseBody(request, schema);

    const membership = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId: user.id, organizationId } },
      select: { organizationId: true },
    });

    if (!membership) {
      return jsonError("Keine Berechtigung für diese Organisation.", 403);
    }

    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_ORG_COOKIE, organizationId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });

    return jsonOk({ organizationId });
  } catch (error) {
    return handleApiError(error);
  }
}
