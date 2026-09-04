import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { rollbackImportJob } from "@/lib/import/rollback";
import { requirePermission } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

/** Macht einen Importlauf rückgängig, soweit dies gefahrlos möglich ist. */
export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const actor = await requirePermission("importData");

    const summary = await rollbackImportJob(id, {
      id: actor.id,
      email: actor.email ?? "",
    });

    return jsonOk(summary);
  } catch (error) {
    if (error instanceof Error && !("status" in error)) {
      // Fachliche Hinweise (bereits zurückgenommen, Simulation, unbekannt)
      // sind für den Aufrufenden verständlich und dürfen ausgegeben werden.
      const known = [
        "Importlauf nicht gefunden.",
        "Eine Simulation kann nicht rückgängig gemacht werden.",
        "Dieser Import wurde bereits rückgängig gemacht.",
      ];
      if (known.includes(error.message)) return jsonError(error.message, 409);
    }
    return handleApiError(error);
  }
}
