import type { NotificationType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";

type NotifyInput = {
  userId: string;
  organizationId?: string | null;
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
  email?: boolean;
};

/** Erstellt eine interne Benachrichtigung, optional zusätzlich per E-Mail. */
export async function notify(input: NotifyInput): Promise<void> {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: input.userId,
        organizationId: input.organizationId ?? null,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null,
      },
    });

    if (input.email) {
      const user = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { email: true, name: true },
      });
      if (user) {
        const result = await sendMail({
          to: user.email,
          subject: input.title,
          text: `Hallo ${user.name}\n\n${input.body ?? input.title}\n\nFreundliche Grüsse\nFas-Nav.ch`,
        });
        if (result.sent) {
          await prisma.notification.update({
            where: { id: notification.id },
            data: { emailSentAt: new Date() },
          });
        }
      }
    }
  } catch (error) {
    console.error("[notify] Benachrichtigung fehlgeschlagen:", error);
  }
}

/** Benachrichtigt alle Mitglieder einer Organisation. */
export async function notifyOrganization(
  organizationId: string,
  input: Omit<NotifyInput, "userId" | "organizationId">,
): Promise<void> {
  const memberships = await prisma.membership.findMany({
    where: { organizationId, user: { isActive: true } },
    select: { userId: true },
  });
  await Promise.all(
    memberships.map((m) => notify({ ...input, userId: m.userId, organizationId })),
  );
}

/** Benachrichtigt alle aktiven Admin-/Team-Accounts. */
export async function notifyStaff(
  input: Omit<NotifyInput, "userId">,
): Promise<void> {
  const staff = await prisma.user.findMany({
    where: { role: { in: ["SUPERADMIN", "ADMIN", "TEAM"] }, isActive: true },
    select: { id: true },
  });
  await Promise.all(staff.map((u) => notify({ ...input, userId: u.id })));
}
