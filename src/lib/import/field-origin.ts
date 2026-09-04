import type { FieldOriginType, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { MAPPED_FIELD_KEYS } from "@/lib/import/mapping";

/**
 * Hält fest, wer einen Feldwert zuletzt gesetzt hat.
 *
 * Nur Felder, die ein Import überhaupt schreiben könnte, werden vermerkt –
 * für alles andere hätte die Herkunft keine Wirkung.
 */
const IMPORTABLE_FIELDS = new Set<string>(MAPPED_FIELD_KEYS);

/**
 * Markiert manuell bearbeitete Felder, damit spätere Rechercheimporte sie
 * nicht überschreiben.
 *
 * Wird nach jeder redaktionellen Änderung an einer Organisation aufgerufen.
 * Fehler dürfen die eigentliche Bearbeitung nicht gefährden.
 */
export async function markManualEdits(
  organizationId: string,
  changedFields: string[],
  origin: Extract<FieldOriginType, "ADMIN_EDITED" | "ORGANIZATION_EDITED">,
  changedById: string,
): Promise<void> {
  const relevant = changedFields.filter((field) => IMPORTABLE_FIELDS.has(field));
  if (!relevant.length) return;

  try {
    await prisma.$transaction(
      relevant.map((field) =>
        prisma.fieldOrigin.upsert({
          where: { organizationId_field: { organizationId, field } },
          create: { organizationId, field, origin, changedById },
          update: { origin, changedById },
        }),
      ),
    );
  } catch (error) {
    console.error("[field-origin] Herkunft konnte nicht vermerkt werden:", error);
  }
}

/**
 * Ermittelt, welche Felder eine Änderung tatsächlich verändert hat.
 * Unveränderte Felder gelten nicht als manuelle Bearbeitung.
 */
export function changedFieldNames(
  before: Record<string, unknown>,
  patch: Record<string, unknown>,
): string[] {
  const changed: string[] = [];

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (!IMPORTABLE_FIELDS.has(key)) continue;

    const current = before[key];
    if (current instanceof Date && value instanceof Date) {
      if (current.getTime() !== value.getTime()) changed.push(key);
      continue;
    }
    if (Array.isArray(current) && Array.isArray(value)) {
      if (current.length !== value.length || current.some((item, i) => item !== value[i])) {
        changed.push(key);
      }
      continue;
    }
    if (current !== value) changed.push(key);
  }

  return changed;
}

/** Lädt die Herkunft aller Felder einer Organisation. */
export async function getFieldOrigins(
  organizationId: string,
): Promise<Map<string, FieldOriginType>> {
  const rows = await prisma.fieldOrigin.findMany({
    where: { organizationId },
    select: { field: true, origin: true },
  });
  return new Map(rows.map((row) => [row.field, row.origin]));
}

export type FieldOriginSelect = Prisma.FieldOriginSelect;
