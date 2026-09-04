import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { analyseFile } from "@/lib/import/service";
import {
  DEFAULT_IMPORT_OPTIONS,
  MAX_IMPORT_FILE_BYTES,
  importOptionsSchema,
} from "@/lib/import/options";
import { checkRateLimit } from "@/lib/rate-limit";
import { requirePermission } from "@/lib/rbac";

export const dynamic = "force-dynamic";

/**
 * Analysiert eine hochgeladene Recherchedatei, ohne etwas zu speichern.
 * Liefert die geplanten Aktionen je Datensatz für die Vorschau.
 */
export async function POST(request: Request) {
  try {
    const actor = await requirePermission("importData");

    const limit = checkRateLimit(`import-analyse:${actor.id}`, 20, 10 * 60_000);
    if (!limit.ok) {
      return jsonError("Zu viele Analysen in kurzer Zeit. Bitte kurz warten.", 429);
    }

    const formData = await request.formData().catch(() => null);
    if (!formData) return jsonError("Ungültiger Upload.", 400);

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return jsonError("Es wurde keine Datei übermittelt.", 400);
    }

    if (file.size === 0) return jsonError("Die Datei ist leer.", 400);
    if (file.size > MAX_IMPORT_FILE_BYTES) {
      return jsonError(
        `Die Datei ist zu gross. Erlaubt sind maximal ${Math.round(MAX_IMPORT_FILE_BYTES / 1024 / 1024)} MB.`,
        413,
      );
    }

    // Nur JSON wird akzeptiert; ausführbare Inhalte gelangen damit nicht
    // in die Verarbeitung.
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

    const content = await file.text();
    const analysis = await analyseFile(content, options);

    if (!analysis.ok) {
      return jsonError("Die Datei konnte nicht gelesen werden.", 422, {
        // Die ersten Meldungen genügen, um das Problem zu erkennen.
        _: analysis.errors.slice(0, 20).join(" · "),
      });
    }

    return jsonOk({
      filename: file.name,
      fileSize: file.size,
      fileHash: analysis.fileHash,
      metadata: analysis.plan.metadata,
      summary: analysis.plan.summary,
      // Die aufbereiteten Nutzdaten bleiben serverseitig; der Client erhält
      // nur die Anzeigeinformationen.
      records: analysis.plan.records.map((record) => ({
        importId: record.importId,
        name: record.name,
        type: record.type,
        city: record.city,
        cantonCode: record.cantonCode,
        slug: record.slug,
        confidenceScore: record.confidenceScore,
        activityStatus: record.activityStatus,
        needsManualReview: record.needsManualReview,
        action: record.action,
        message: record.message,
        publicationStatus: record.publicationStatus,
        existingLabel: record.existingLabel,
        matchReason: record.match?.reason ?? null,
        matchKind: record.match?.kind ?? null,
        changedFields: record.changedFields,
        protectedFields: record.protectedFields,
        errors: record.errors,
        plannedEvent: record.plannedEvent
          ? {
              title: record.plannedEvent.title,
              startDate: record.plannedEvent.startDate.toISOString(),
            }
          : null,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
