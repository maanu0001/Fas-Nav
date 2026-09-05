import { cache } from "react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";
import type { Role } from "@prisma/client";

/**
 * Wartungsmodus.
 *
 * Die beiden Werte liegen im vorhandenen Schlüssel-Wert-Speicher
 * `SiteSetting`; dafür ist keine eigene Tabelle nötig. Ohne Eintrag gilt der
 * Wartungsmodus als ausgeschaltet – die Anwendung verhält sich also
 * unverändert, solange ihn niemand einschaltet.
 *
 * Die Prüfung läuft ausschliesslich serverseitig in den Layouts des
 * öffentlichen Bereichs und des Dashboards. Damit greift sie auch bei
 * abgeschaltetem JavaScript und bei direkt aufgerufenen Adressen. Bewusst
 * wird die Wartungsseite *gerendert* statt umgeleitet: Eine Umleitung könnte
 * je nach Ziel im Kreis laufen.
 */

export const MAINTENANCE_ENABLED_KEY = "maintenance_enabled";
export const MAINTENANCE_MESSAGE_KEY = "maintenance_message";

export const DEFAULT_MAINTENANCE_MESSAGE =
  "Fas-Nav.ch wird momentan aktualisiert. Wir sind in Kürze wieder für dich da.";

export type MaintenanceState = {
  enabled: boolean;
  message: string;
};

/**
 * Wandelt den gespeicherten Wert in einen Wahrheitswert um.
 *
 * Das Formular speichert Zeichenketten, ältere Einträge könnten echte
 * Wahrheitswerte enthalten – beides wird akzeptiert.
 */
function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["true", "1", "ja", "on"].includes(value.trim().toLowerCase());
  return false;
}

/** Liest den Wartungsmodus. Pro Anfrage wird höchstens einmal abgefragt. */
export const getMaintenanceState = cache(async (): Promise<MaintenanceState> => {
  const rows = await prisma.siteSetting.findMany({
    where: { key: { in: [MAINTENANCE_ENABLED_KEY, MAINTENANCE_MESSAGE_KEY] } },
    select: { key: true, value: true },
  });

  const map = new Map(rows.map((row) => [row.key, row.value]));
  const message = map.get(MAINTENANCE_MESSAGE_KEY);

  return {
    enabled: toBoolean(map.get(MAINTENANCE_ENABLED_KEY)),
    message:
      typeof message === "string" && message.trim() ? message.trim() : DEFAULT_MAINTENANCE_MESSAGE,
  };
});

/**
 * Entscheidet, ob für die aktuelle Anfrage die Wartungsseite gilt.
 *
 * Nur die Administration arbeitet während der Wartung normal weiter. Ein
 * Login allein genügt also nicht, um den Wartungsmodus zu umgehen.
 */
export async function maintenanceScreenFor(): Promise<MaintenanceState | null> {
  const state = await getMaintenanceState();
  if (!state.enabled) return null;

  const session = await auth();
  const role = session?.user?.role as Role | undefined;
  if (session?.user?.isActive && isAdmin(role)) return null;

  return state;
}
