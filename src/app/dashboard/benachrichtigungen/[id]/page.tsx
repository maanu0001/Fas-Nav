import { notFound, redirect } from "next/navigation";

import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Öffnet eine Benachrichtigung und markiert sie dabei als gelesen.
 *
 * Bewusst als Serverseite statt als Klick-Handler: So greift die Markierung
 * auch ohne JavaScript, und die Berechtigung wird an derselben Stelle geprüft,
 * an der geschrieben wird. Die Bedingung `userId` in `updateMany` sorgt dafür,
 * dass fremde Benachrichtigungen selbst bei erratener Kennung unberührt
 * bleiben – es wird schlicht kein Datensatz getroffen.
 */
export default async function OpenNotificationPage({ params }: Params) {
  const { id } = await params;
  const user = await requireUser();

  const notification = await prisma.notification.findFirst({
    where: { id, userId: user.id },
    select: { id: true, link: true, readAt: true },
  });

  if (!notification) notFound();

  if (!notification.readAt) {
    await prisma.notification.updateMany({
      where: { id: notification.id, userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
  }

  // Nur anwendungsinterne Ziele weiterverfolgen: Ein von aussen gesetzter
  // Link dürfte sonst zu einer fremden Adresse führen.
  const ziel =
    notification.link && notification.link.startsWith("/")
      ? notification.link
      : "/dashboard/benachrichtigungen";

  redirect(ziel);
}
