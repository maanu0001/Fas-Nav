import { auth } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { runAgendaReminders } from "@/lib/agenda-reminder-job";
import { can } from "@/lib/rbac";
import type { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * Erinnerungslauf auslösen.
 *
 * Zwei Wege sind vorgesehen:
 *
 * - Ein angemeldeter ADMIN, der den Lauf im Dashboard von Hand startet.
 * - Ein Zeitplan, der ein Merkwort im Kopf `Authorization: Bearer …` mitgibt.
 *   Das Merkwort steht in CRON_SECRET. Ist es nicht gesetzt, bleibt dieser
 *   Weg verschlossen – ein leeres Merkwort darf niemals genügen.
 *
 * Der Lauf selbst ist mehrfach ausführbar, ohne doppelte Mails zu erzeugen;
 * darum kümmert sich runAgendaReminders über die Sperrfrist.
 */
export async function POST(request: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    const header = request.headers.get("authorization") ?? "";
    const mitMerkwort = Boolean(secret) && header === `Bearer ${secret}`;

    let ausloeser = "cron";

    if (!mitMerkwort) {
      const session = await auth();
      const rolle = session?.user?.role as Role | undefined;
      if (!session?.user?.isActive) return jsonError("Nicht angemeldet.", 401);
      if (!can(rolle, "manageSettings")) return jsonError("Keine Berechtigung.", 403);
      ausloeser = session.user.email ?? "admin";

      await logAudit({
        userId: session.user.id,
        userLabel: session.user.email,
        action: "agendaReminder.run",
        entity: "SiteSetting",
      });
    }

    const ergebnis = await runAgendaReminders();

    // Nur Zahlen ins Protokoll – keine Adressen, keine Mailinhalte.
    console.info(
      `[agenda-reminder] Auslöser=${ausloeser === "cron" ? "cron" : "admin"} geprüft=${ergebnis.geprueft} gesendet=${ergebnis.gesendet} ohneEmpfänger=${ergebnis.ohneEmpfaenger} fehlgeschlagen=${ergebnis.fehlgeschlagen} zurückgesetzt=${ergebnis.zurueckgesetzt}`,
    );

    return jsonOk(ergebnis);
  } catch (error) {
    return handleApiError(error);
  }
}
