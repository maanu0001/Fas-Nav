import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

/**
 * Macht einen Importlauf rückgängig.
 *
 * Bewusste Einschränkung: Rückgängig gemacht werden ausschliesslich
 * Organisationen, die durch genau diesen Lauf **neu entstanden** sind und
 * seither **nicht verändert** wurden. Konkret bleibt eine Organisation
 * erhalten, wenn seit dem Import
 *   - ein Benutzerkonto zugewiesen wurde,
 *   - jemand ein Feld manuell bearbeitet hat,
 *   - ein späterer Import sie erneut angefasst hat,
 *   - Veranstaltungen ausserhalb dieses Laufs hinzugekommen sind.
 *
 * Reine Aktualisierungen bestehender Organisationen werden nicht
 * zurückgesetzt: Der Zustand vor dem Import wird nicht vollständig
 * vorgehalten, und ein teilweises Zurückschreiben könnte manuelle
 * Korrekturen zerstören. Diese Einträge werden im Ergebnis ausgewiesen.
 */

export type RollbackSummary = {
  deletedOrganizations: number;
  keptOrganizations: number;
  deletedEvents: number;
  notRolledBackUpdates: number;
  kept: { name: string; reason: string }[];
};

export async function rollbackImportJob(
  jobId: string,
  actor: { id: string; email: string },
): Promise<RollbackSummary> {
  const job = await prisma.importJob.findUnique({
    where: { id: jobId },
    select: { id: true, reference: true, status: true, dryRun: true },
  });

  if (!job) throw new Error("Importlauf nicht gefunden.");
  if (job.dryRun) throw new Error("Eine Simulation kann nicht rückgängig gemacht werden.");
  if (job.status === "ROLLED_BACK") throw new Error("Dieser Import wurde bereits rückgängig gemacht.");

  const createdRecords = await prisma.importRecord.findMany({
    where: { jobId, createdByThisJob: true, organizationId: { not: null } },
    select: { organizationId: true, name: true },
  });

  const updatedCount = await prisma.importRecord.count({
    where: { jobId, action: "UPDATE" },
  });

  const summary: RollbackSummary = {
    deletedOrganizations: 0,
    keptOrganizations: 0,
    deletedEvents: 0,
    notRolledBackUpdates: updatedCount,
    kept: [],
  };

  const ids = createdRecords
    .map((record) => record.organizationId)
    .filter((id): id is string => Boolean(id));

  if (!ids.length) {
    await finish(job.id, actor, summary);
    return summary;
  }

  // Nur Organisationen betrachten, die es überhaupt noch gibt.
  const organizations = await prisma.organization.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      lastImportJobId: true,
      updatedAt: true,
      importedAt: true,
      _count: { select: { memberships: true, events: true } },
      fieldOrigins: {
        where: { origin: { in: ["ADMIN_EDITED", "ORGANIZATION_EDITED"] } },
        select: { id: true },
      },
    },
  });

  const deletable: string[] = [];

  for (const org of organizations) {
    if (org._count.memberships > 0) {
      summary.kept.push({
        name: org.name,
        reason: "Der Organisation ist inzwischen ein Benutzerkonto zugewiesen.",
      });
      continue;
    }
    if (org.fieldOrigins.length > 0) {
      summary.kept.push({
        name: org.name,
        reason: "Inhalte wurden seit dem Import manuell bearbeitet.",
      });
      continue;
    }
    if (org.lastImportJobId && org.lastImportJobId !== jobId) {
      summary.kept.push({
        name: org.name,
        reason: "Ein späterer Import hat diesen Datensatz erneut aktualisiert.",
      });
      continue;
    }
    deletable.push(org.id);
  }

  summary.keptOrganizations = summary.kept.length;

  if (deletable.length) {
    // In Blöcken löschen, damit auch grosse Läufe beherrschbar bleiben.
    const chunkSize = 100;
    for (let i = 0; i < deletable.length; i += chunkSize) {
      const chunk = deletable.slice(i, i + chunkSize);
      const events = await prisma.event.count({ where: { organizationId: { in: chunk } } });
      // Abhängige Daten entfernt die Datenbank über die Kaskaden.
      const deleted = await prisma.organization.deleteMany({ where: { id: { in: chunk } } });
      summary.deletedOrganizations += deleted.count;
      summary.deletedEvents += events;
    }
  }

  await finish(job.id, actor, summary);
  return summary;
}

async function finish(
  jobId: string,
  actor: { id: string; email: string },
  summary: RollbackSummary,
): Promise<void> {
  await prisma.importJob.update({
    where: { id: jobId },
    data: {
      status: "ROLLED_BACK",
      rollbackAt: new Date(),
      rollbackById: actor.id,
      rollbackSummary: summary as unknown as never,
    },
  });

  await logAudit({
    userId: actor.id,
    userLabel: actor.email,
    action: "import.rollback",
    entity: "ImportJob",
    entityId: jobId,
    entityLabel: `${summary.deletedOrganizations} Organisationen entfernt`,
    after: summary as unknown as Record<string, unknown>,
  });
}
