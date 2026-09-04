import type { ImportRecordAction, Prisma } from "@prisma/client";

import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { uniqueEventSlug, uniqueOrganizationSlug } from "@/lib/slug-service";
import type { ImportOptions } from "@/lib/import/options";
import type { PlannedRecord, PlanSummary } from "@/lib/import/planner";

/**
 * Führt einen zuvor geplanten Import aus.
 *
 * Grundsätze:
 * - Jeder Datensatz wird in einer eigenen Transaktion geschrieben. Ein
 *   fehlerhafter Datensatz bricht damit nicht den gesamten Lauf ab.
 * - Neu angelegte Organisationen sind immer UNCLAIMED; es entsteht kein
 *   Benutzerkonto.
 * - Manuell bearbeitete Felder werden nicht überschrieben.
 */

export type ExecutionResult = {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  duplicates: number;
  review: number;
  invalid: number;
  events: number;
};

/** Anzahl Datensätze, die zwischen zwei Fortschrittsmeldungen liegen. */
const BATCH_SIZE = 25;

export async function executeImport(options: {
  jobId: string;
  records: PlannedRecord[];
  importOptions: ImportOptions;
  actor: { id: string; email: string };
}): Promise<ExecutionResult> {
  const { jobId, records, importOptions, actor } = options;

  const result: ExecutionResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    duplicates: 0,
    review: 0,
    invalid: 0,
    events: 0,
  };

  // Ergebniszeilen werden gesammelt und blockweise geschrieben, damit auch
  // grosse Dateien nicht tausende Einzelabfragen erzeugen.
  const pending: Prisma.ImportRecordCreateManyInput[] = [];

  async function flush() {
    if (!pending.length) return;
    await prisma.importRecord.createMany({ data: pending, skipDuplicates: true });
    pending.length = 0;
  }

  for (const record of records) {
    // Nicht ausführbare Zustände werden nur protokolliert.
    if (
      record.action === "INVALID" ||
      record.action === "SKIP" ||
      record.action === "DUPLICATE"
    ) {
      if (record.action === "INVALID") result.invalid += 1;
      if (record.action === "SKIP") result.skipped += 1;
      if (record.action === "DUPLICATE") result.duplicates += 1;

      pending.push(buildRecordRow(jobId, record, record.action, null, false));
      if (pending.length >= BATCH_SIZE) await flush();
      continue;
    }

    try {
      const outcome = await applyRecord(jobId, record, importOptions);

      if (outcome.action === "CREATE" || outcome.action === "REVIEW") {
        result.created += 1;
        if (outcome.action === "REVIEW") result.review += 1;
      } else if (outcome.action === "UPDATE") {
        result.updated += 1;
      }
      if (outcome.eventCreated) result.events += 1;

      pending.push(
        buildRecordRow(jobId, record, outcome.action, outcome.organizationId, outcome.created),
      );
    } catch (error) {
      result.failed += 1;
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      console.error(`[import] Datensatz ${record.importId} fehlgeschlagen:`, error);
      pending.push({
        jobId,
        action: "FAILED" as ImportRecordAction,
        importId: record.importId,
        name: record.name,
        type: record.type,
        canton: record.cantonCode,
        locality: record.city,
        confidenceScore: record.confidenceScore,
        organizationId: record.organizationId,
        createdByThisJob: false,
        message: message.slice(0, 1000),
        details: { errors: [message] } as Prisma.InputJsonValue,
      });
    }

    if (pending.length >= BATCH_SIZE) await flush();
  }

  await flush();

  await logAudit({
    userId: actor.id,
    userLabel: actor.email,
    action: "import.execute",
    entity: "ImportJob",
    entityId: jobId,
    entityLabel: `${result.created} neu, ${result.updated} aktualisiert`,
    after: result as unknown as Record<string, unknown>,
  });

  return result;
}

function buildRecordRow(
  jobId: string,
  record: PlannedRecord,
  action: ImportRecordAction,
  organizationId: string | null,
  createdByThisJob: boolean,
): Prisma.ImportRecordCreateManyInput {
  return {
    jobId,
    action,
    importId: record.importId,
    name: record.name,
    type: record.type,
    canton: record.cantonCode,
    locality: record.city,
    confidenceScore: record.confidenceScore,
    organizationId,
    createdByThisJob,
    message: record.message,
    details: {
      changedFields: record.changedFields,
      protectedFields: record.protectedFields,
      errors: record.errors,
      match: record.match,
      publicationStatus: record.publicationStatus,
    } as Prisma.InputJsonValue,
  };
}

type ApplyOutcome = {
  action: ImportRecordAction;
  organizationId: string;
  created: boolean;
  eventCreated: boolean;
};

/** Schreibt einen einzelnen Datensatz in einer Transaktion. */
async function applyRecord(
  jobId: string,
  record: PlannedRecord,
  options: ImportOptions,
): Promise<ApplyOutcome> {
  const payload = record.payload;
  if (!payload) throw new Error("Keine aufbereiteten Daten vorhanden.");

  const isUpdate = record.action === "UPDATE" && record.organizationId;

  // Der Slug wird ausserhalb der Transaktion ermittelt, da er mehrere
  // Leseabfragen benötigt.
  const slug = isUpdate
    ? null
    : await uniqueOrganizationSlug(record.name, { preferred: record.slug });

  const organizationId = await prisma.$transaction(async (tx) => {
    if (isUpdate && record.organizationId) {
      const data: Prisma.OrganizationUncheckedUpdateInput = {
        ...pickFields(payload.writeFields, record.changedFields),
        ...researchFields(record.importId, payload, jobId),
      };

      await tx.organization.update({ where: { id: record.organizationId }, data });

      // Nur tatsächlich geschriebene Felder gelten wieder als importiert.
      await markFieldOrigins(tx, record.organizationId, record.changedFields);

      return record.organizationId;
    }

    const created = await tx.organization.create({
      data: {
        ...(payload.writeFields as Prisma.OrganizationUncheckedCreateInput),
        slug: slug!,
        type: record.type,
        cantonId: payload.cantonId,
        city: payload.fields.city,
        name: record.name,
        status: record.publicationStatus,
        publishedAt: record.publicationStatus === "PUBLISHED" ? new Date() : null,
        // Importierte Profile gehören zunächst niemandem und werden nicht
        // automatisch als geprüft ausgewiesen.
        claimStatus: "UNCLAIMED",
        verification: "UNVERIFIED",
        ...researchFields(record.importId, payload, jobId),
      },
    });

    await markFieldOrigins(tx, created.id, Object.keys(payload.writeFields));

    return created.id;
  });

  // Social Links und Quellen ergänzen, ohne bestehende Einträge zu verlieren.
  await upsertSocialLinks(organizationId, payload.socialLinks);
  await upsertSources(organizationId, payload.sources);

  let eventCreated = false;
  if (record.plannedEvent && options.importEvents) {
    eventCreated = await ensureEvent(organizationId, record, payload.cantonId);
  }

  return {
    action: record.action,
    organizationId,
    created: !isUpdate,
    eventCreated,
  };
}

function pickFields(
  source: Record<string, unknown>,
  keys: string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    if (key in source) result[key] = source[key];
  }
  return result;
}

/**
 * Recherche-Metadaten werden immer geschrieben – sie sind rein intern und
 * beschreiben die Herkunft, nicht den redaktionellen Inhalt.
 *
 * Die externalImportId ist dabei der Anker für wiederholte Importe: Sie wird
 * bei Neuanlage und Aktualisierung gesetzt, damit derselbe Datensatz später
 * sicher wiedergefunden wird.
 */
function researchFields(
  importId: string,
  payload: NonNullable<PlannedRecord["payload"]>,
  jobId: string,
) {
  return {
    externalImportId: importId,
    importSource: "research-import",
    importedAt: new Date(),
    lastImportJobId: jobId,
    confidenceScore: payload.research.confidenceScore,
    needsManualReview: payload.research.needsManualReview,
    reviewReasons: payload.research.reviewReasons,
    activityStatus: payload.research.activityStatus as never,
    lastActivityEvidence: payload.research.lastActivityEvidence,
    lastVerifiedAt: payload.research.lastVerifiedAt,
    dataNotes: payload.research.dataNotes,
  } satisfies Partial<Prisma.OrganizationUncheckedCreateInput>;
}

/** Vermerkt, dass die genannten Felder zuletzt aus einem Import stammen. */
async function markFieldOrigins(
  tx: Prisma.TransactionClient,
  organizationId: string,
  fields: string[],
): Promise<void> {
  if (!fields.length) return;

  // Bestehende Einträge werden auf IMPORTED zurückgesetzt, weil der Wert
  // nun tatsächlich aus dem Import stammt.
  await tx.fieldOrigin.deleteMany({
    where: { organizationId, field: { in: fields } },
  });
  await tx.fieldOrigin.createMany({
    data: fields.map((field) => ({ organizationId, field, origin: "IMPORTED" as const })),
    skipDuplicates: true,
  });
}

/** Ergänzt Social Links, ohne vorhandene zu überschreiben. */
async function upsertSocialLinks(
  organizationId: string,
  links: { platform: string; url: string }[],
): Promise<void> {
  if (!links.length) return;

  const existing = await prisma.socialLink.findMany({
    where: { organizationId },
    select: { platform: true },
  });
  const known = new Set(existing.map((link) => link.platform));

  const missing = links.filter((link) => !known.has(link.platform as never));
  if (!missing.length) return;

  await prisma.socialLink.createMany({
    data: missing.map((link, index) => ({
      organizationId,
      platform: link.platform as never,
      url: link.url,
      sortOrder: existing.length + index,
    })),
    skipDuplicates: true,
  });
}

/** Speichert Recherchequellen; doppelte URLs werden übersprungen. */
async function upsertSources(
  organizationId: string,
  sources: { url: string; type: string | null; title: string | null; accessedAt: Date | null }[],
): Promise<void> {
  if (!sources.length) return;

  await prisma.organizationSource.createMany({
    data: sources.map((source) => ({
      organizationId,
      url: source.url,
      type: source.type,
      title: source.title,
      accessedAt: source.accessedAt,
    })),
    skipDuplicates: true,
  });
}

/**
 * Legt einen Agenda-Eintrag für die nächste Ausgabe an.
 * Bestehende Termine derselben Organisation am selben Tag werden erkannt,
 * damit keine Duplikate entstehen.
 */
async function ensureEvent(
  organizationId: string,
  record: PlannedRecord,
  cantonId: string,
): Promise<boolean> {
  const planned = record.plannedEvent;
  if (!planned) return false;

  const dayStart = new Date(planned.startDate);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(planned.startDate);
  dayEnd.setUTCHours(23, 59, 59, 999);

  const existing = await prisma.event.findFirst({
    where: { organizationId, startDate: { gte: dayStart, lte: dayEnd } },
    select: { id: true },
  });
  if (existing) return false;

  const slug = await uniqueEventSlug(planned.title, {
    city: record.city,
    year: planned.startDate.getUTCFullYear(),
  });

  const note = record.payload?.nextEdition?.note ?? null;
  const sourceUrl = record.payload?.nextEdition?.sourceUrl ?? null;

  await prisma.event.create({
    data: {
      organizationId,
      title: planned.title,
      slug,
      type: record.type === "CARNIVAL" ? "FASNACHT" : "GUGGENKONZERT",
      startDate: planned.startDate,
      endDate: planned.endDate,
      allDay: true,
      city: record.city,
      cantonId,
      externalUrl: sourceUrl,
      shortDescription: note,
      // Termine aus der Recherche werden nie automatisch veröffentlicht:
      // Datum und Quelle sollen zuerst geprüft werden.
      status: "DRAFT",
    },
  });

  return true;
}

/** Zählt die Ergebnisse eines Plans für die Anzeige vor dem Import. */
export function summariseForJob(summary: PlanSummary) {
  return {
    totalRecords: summary.total,
    createdRecords: summary.create + summary.review,
    updatedRecords: summary.update,
    skippedRecords: summary.skip,
    duplicateRecords: summary.duplicate,
    reviewRecords: summary.review,
    invalidRecords: summary.invalid,
    eventRecords: summary.events,
  };
}
