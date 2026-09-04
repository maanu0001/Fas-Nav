import { z } from "zod";

/**
 * Konfiguration eines Importlaufs.
 *
 * Bewusst klein gehalten: jede Option hat eine sichere Voreinstellung und
 * eine klar beschreibbare Wirkung.
 */
export const importOptionsSchema = z.object({
  /** Nur neue Datensätze anlegen oder auch vorhandene aktualisieren. */
  mode: z.enum(["CREATE_ONLY", "CREATE_AND_UPDATE"]).default("CREATE_AND_UPDATE"),
  /**
   * Sichere Datensätze automatisch veröffentlichen oder alles als Entwurf
   * anlegen. Unsichere Datensätze werden nie veröffentlicht – unabhängig
   * von dieser Einstellung.
   */
  publicationMode: z.enum(["SAFE_PUBLISH", "DRAFT_ONLY"]).default("SAFE_PUBLISH"),
  /** Eindeutige kommende Fasnachtsdaten als Agenda-Einträge anlegen. */
  importEvents: z.boolean().default(true),
});

export type ImportOptions = z.infer<typeof importOptionsSchema>;

export const DEFAULT_IMPORT_OPTIONS: ImportOptions = {
  mode: "CREATE_AND_UPDATE",
  publicationMode: "SAFE_PUBLISH",
  importEvents: true,
};

/**
 * Mögliche Dubletten werden niemals automatisch importiert.
 * Diese Regel ist bewusst nicht konfigurierbar und daher als Konstante
 * dokumentiert statt als Option.
 */
export const NEVER_AUTO_MERGE_POSSIBLE_DUPLICATES = true;

export const IMPORT_MODE_LABELS: Record<ImportOptions["mode"], string> = {
  CREATE_ONLY: "Nur neue Datensätze",
  CREATE_AND_UPDATE: "Neue anlegen und vorhandene aktualisieren",
};

export const PUBLICATION_MODE_LABELS: Record<ImportOptions["publicationMode"], string> = {
  SAFE_PUBLISH: "Sichere Datensätze automatisch veröffentlichen",
  DRAFT_ONLY: "Alles als Entwurf importieren",
};

/** Grösse der Datei in Bytes, die höchstens verarbeitet wird. */
export const MAX_IMPORT_FILE_BYTES = 20 * 1024 * 1024;
