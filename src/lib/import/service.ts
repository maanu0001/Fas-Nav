import { createHash } from "node:crypto";

import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { executeImport, summariseForJob } from "@/lib/import/executor";
import type { ImportOptions } from "@/lib/import/options";
import { buildImportPlan, parseImportFile, type ImportPlan } from "@/lib/import/planner";

/**
 * Bindeglied zwischen Datei, Planung und Ausführung.
 * Dry Run und echter Import durchlaufen exakt dieselbe Planung.
 */

export type AnalyseResult =
  | { ok: false; errors: string[] }
  | { ok: true; plan: ImportPlan; fileHash: string };

export async function analyseFile(
  content: string,
  options: ImportOptions,
): Promise<AnalyseResult> {
  const parsed = parseImportFile(content);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };

  const plan = await buildImportPlan(parsed.organizations, parsed.metadata, options);
  const fileHash = createHash("sha256").update(content).digest("hex");

  return { ok: true, plan, fileHash };
}

/** Fortlaufende, lesbare Kennung eines Laufs, z.B. IMP-2026-09-04-001. */
export async function nextJobReference(): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  const prefix = `IMP-${today}-`;

  const last = await prisma.importJob.findFirst({
    where: { reference: { startsWith: prefix } },
    orderBy: { reference: "desc" },
    select: { reference: true },
  });

  const lastNumber = last ? Number(last.reference.slice(prefix.length)) : 0;
  return `${prefix}${String(lastNumber + 1).padStart(3, "0")}`;
}

export type RunInput = {
  filename: string;
  fileSize: number;
  fileHash: string;
  plan: ImportPlan;
  options: ImportOptions;
  dryRun: boolean;
  actor: { id: string; email: string };
};

/**
 * Legt den Lauf an und führt ihn aus.
 * Bei einer Simulation wird der Lauf protokolliert, aber nichts geschrieben.
 */
export async function runImport(input: RunInput) {
  const counts = summariseForJob(input.plan.summary);
  const reference = await nextJobReference();

  const job = await prisma.importJob.create({
    data: {
      reference,
      filename: input.filename.slice(0, 200),
      fileSize: input.fileSize,
      fileHash: input.fileHash,
      dryRun: input.dryRun,
      status: input.dryRun ? "DRY_RUN" : "RUNNING",
      importedById: input.actor.id,
      importedByLabel: input.actor.email,
      options: input.options as unknown as never,
      metadata: input.plan.metadata as unknown as never,
      totalRecords: counts.totalRecords,
    },
    select: { id: true, reference: true },
  });

  // --- Simulation: Ergebnis festhalten, nichts verändern -------------------
  if (input.dryRun) {
    await prisma.importJob.update({
      where: { id: job.id },
      data: {
        completedAt: new Date(),
        createdRecords: counts.createdRecords,
        updatedRecords: counts.updatedRecords,
        skippedRecords: counts.skippedRecords,
        duplicateRecords: counts.duplicateRecords,
        reviewRecords: counts.reviewRecords,
        invalidRecords: counts.invalidRecords,
        eventRecords: counts.eventRecords,
      },
    });

    await logAudit({
      userId: input.actor.id,
      userLabel: input.actor.email,
      action: "import.dry_run",
      entity: "ImportJob",
      entityId: job.id,
      entityLabel: `${job.reference} · ${counts.totalRecords} Datensätze`,
      after: counts as unknown as Record<string, unknown>,
    });

    return { job, counts, result: null };
  }

  // --- Echter Import ------------------------------------------------------
  try {
    const result = await executeImport({
      jobId: job.id,
      records: input.plan.records,
      importOptions: input.options,
      actor: input.actor,
    });

    await prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: result.failed > 0 ? "COMPLETED_WITH_ERRORS" : "COMPLETED",
        completedAt: new Date(),
        createdRecords: result.created,
        updatedRecords: result.updated,
        skippedRecords: result.skipped,
        failedRecords: result.failed,
        duplicateRecords: result.duplicates,
        reviewRecords: result.review,
        invalidRecords: result.invalid,
        eventRecords: result.events,
      },
    });

    return { job, counts, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unbekannter Fehler";
    await prisma.importJob.update({
      where: { id: job.id },
      data: { status: "FAILED", completedAt: new Date(), errorMessage: message.slice(0, 2000) },
    });
    throw error;
  }
}
