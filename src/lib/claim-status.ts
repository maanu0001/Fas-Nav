import type { Prisma, PrismaClient } from "@prisma/client";

type Client = PrismaClient | Prisma.TransactionClient;

/**
 * Hält den Übernahmestatus einer Organisation im Einklang mit ihren Zugriffen.
 *
 * Sobald mindestens ein Konto Zugriff hat, gilt das Profil als übernommen.
 * Wird der letzte Zugriff entfernt, fällt es auf „nicht beansprucht“ zurück –
 * die öffentliche Seite bleibt dabei unverändert bestehen.
 *
 * Eine bereits erteilte Verifizierung wird nicht angetastet; darüber
 * entscheiden ausschliesslich Admin und Team.
 */
export async function syncClaimStatus(
  client: Client,
  organizationId: string,
): Promise<"UNCLAIMED" | "CLAIMED" | null> {
  const [organization, memberCount] = await Promise.all([
    client.organization.findUnique({
      where: { id: organizationId },
      select: { claimStatus: true },
    }),
    client.membership.count({ where: { organizationId } }),
  ]);

  if (!organization) return null;

  const next = memberCount > 0 ? "CLAIMED" : "UNCLAIMED";
  if (organization.claimStatus === next) return null;

  await client.organization.update({
    where: { id: organizationId },
    data: { claimStatus: next },
  });

  return next;
}
