import { createHash, randomBytes } from "node:crypto";

import { handleApiError, jsonOk, parseBody } from "@/lib/api";
import { passwordResetMail, sendMail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";
import { absoluteUrl } from "@/lib/utils";
import { forgotPasswordSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

const TOKEN_TTL_MINUTES = 60;

/**
 * Startet das Zurücksetzen des Passworts.
 *
 * Die Antwort ist immer identisch – unabhängig davon, ob die Adresse
 * existiert. So lässt sich über diesen Endpoint nicht ermitteln,
 * welche E-Mail-Adressen registriert sind.
 */
export async function POST(request: Request) {
  try {
    const body = await parseBody(request, forgotPasswordSchema);

    const ipLimit = checkRateLimit(clientKey(request, "forgot"), 5, 15 * 60_000);
    const mailLimit = checkRateLimit(`forgot:${body.email}`, 3, 15 * 60_000);

    if (ipLimit.ok && mailLimit.ok) {
      const user = await prisma.user.findUnique({
        where: { email: body.email },
        select: { id: true, name: true, email: true, isActive: true },
      });

      if (user && user.isActive) {
        const token = randomBytes(32).toString("hex");
        // Nur der Hash wird gespeichert – der Klartext existiert ausschliesslich im Link.
        const tokenHash = createHash("sha256").update(token).digest("hex");

        await prisma.$transaction([
          prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
          prisma.passwordResetToken.create({
            data: {
              userId: user.id,
              tokenHash,
              expiresAt: new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000),
            },
          }),
        ]);

        const url = absoluteUrl(`/passwort-zuruecksetzen?token=${token}`);
        await sendMail({ to: user.email, ...passwordResetMail(user.name, url) });
      }
    }

    return jsonOk({
      ok: true,
      message:
        "Falls ein Konto mit dieser Adresse existiert, haben wir einen Link zum Zurücksetzen gesendet.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
