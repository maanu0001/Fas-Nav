import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { analyseFile, runImport } from "@/lib/import/service";
import {
  DEFAULT_IMPORT_OPTIONS,
  MAX_IMPORT_FILE_BYTES,
  importOptionsSchema,
} from "@/lib/import/options";
import { checkRateLimit } from "@/lib/rate-limit";
import { requirePermission } from "@/lib/rbac";

export const dynamic = "force-dynamic";
// Grosse Dateien brauchen mehr Zeit als die Standardvorgabe.
export const maxDuration = 300;

/**
 * Führt den Import aus – wahlweise als Simulation.
 *
 * Die Datei wird erneut hochgeladen und serverseitig neu geplant. Damit
 * bestimmt niemals der Client, was geschrieben wird: Manipulierte
 * Vorschaudaten hätten keine Wirkung.
 */
export async function POST(request: Request) {
  try {
    const actor = await requirePermission("importData");

    const limit = checkRateLimit(`import-run:${actor.id}`, 10, 30 * 60_000);
    if (!limit.ok) {
      return jsonError("Zu viele Importläufe in kurzer Zeit. Bitte kurz warten.", 429);
    }

    const formData = await request.formData().catch(() => null);
    if (!formData) return jsonError("Ungültiger Upload.", 400);

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return jsonError("Es wurde keine Datei übermittelt.", 400);
    }
    if (file.size > MAX_IMPORT_FILE_BYTES) {
      return jsonError("Die Datei ist zu gross.", 413);
    }
    const isJson =
      file.type === "application/json" ||
      file.type === "text/json" ||
      file.type === "" ||
      file.name.toLowerCase().endsWith(".json");
    if (!isJson) {
      return jsonError("Es werden ausschliesslich JSON-Dateien unterstützt.", 415);
    }

    const optionsRaw = formData.get("options");
    const options =
      typeof optionsRaw === "string" && optionsRaw
        ? importOptionsSchema.parse(JSON.parse(optionsRaw))
        : DEFAULT_IMPORT_OPTIONS;

    const dryRun = formData.get("dryRun") === "true";

    const content = await file.text();
    const analysis = await analyseFile(content, options);

    if (!analysis.ok) {
      return jsonError("Die Datei konnte nicht gelesen werden.", 422, {
        _: analysis.errors.slice(0, 20).join(" · "),
      });
    }

    const { job, counts, result } = await runImport({
      filename: file.name,
      fileSize: file.size,
      fileHash: analysis.fileHash,
      plan: analysis.plan,
      options,
      dryRun,
      actor: { id: actor.id, email: actor.email ?? "" },
    });

    return jsonOk(
      {
        jobId: job.id,
        reference: job.reference,
        dryRun,
        // Bei der Simulation entspricht das Ergebnis der Planung.
        result: result ?? {
          created: counts.createdRecords,
          updated: counts.updatedRecords,
          skipped: counts.skippedRecords,
          failed: 0,
          duplicates: counts.duplicateRecords,
          review: counts.reviewRecords,
          invalid: counts.invalidRecords,
          events: counts.eventRecords,
        },
      },
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
