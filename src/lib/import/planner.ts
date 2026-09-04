import type { ImportRecordAction, OrganizationType, PublicationStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import {
  buildDuplicateIndex,
  findDuplicate,
  normaliseUrl,
  type DuplicateIndex,
  type DuplicateMatch,
  type ExistingOrganization,
} from "@/lib/import/duplicates";
import {
  MAPPED_FIELD_KEYS,
  mapOrganization,
  mapOrganizationType,
  mapSocialLinks,
  proposeSlug,
  valuesEqual,
  withoutEmptyValues,
  type MappedFields,
} from "@/lib/import/mapping";
import { importFileSchema, importOrganizationSchema } from "@/lib/import/schema";
import type { ImportOptions } from "@/lib/import/options";

/**
 * Planungslauf: validiert, bildet ab, erkennt Dubletten und leitet je
 * Datensatz eine Aktion ab – ohne jede Schreiboperation.
 *
 * Dry Run und echter Import verwenden ausschliesslich dieses Ergebnis.
 * Die Simulation zeigt damit exakt das, was der Import tun würde.
 */

export type PlannedFieldConflict = {
  field: string;
  currentValue: unknown;
  importValue: unknown;
  origin: "ADMIN_EDITED" | "ORGANIZATION_EDITED";
};

export type PlannedRecord = {
  importId: string;
  name: string;
  type: OrganizationType;
  city: string;
  cantonCode: string;
  slug: string;
  confidenceScore: number | null;
  activityStatus: string | null;
  needsManualReview: boolean;
  action: ImportRecordAction;
  /** Grund, wenn der Datensatz nicht importiert wird. */
  message: string | null;
  /** Zielstatus der Veröffentlichung bei Neuanlage. */
  publicationStatus: PublicationStatus;
  match: DuplicateMatch | null;
  existingLabel: string | null;
  organizationId: string | null;
  /** Felder, die tatsächlich geschrieben würden. */
  changedFields: string[];
  /** Felder, die wegen manueller Bearbeitung unangetastet bleiben. */
  protectedFields: PlannedFieldConflict[];
  /** Validierungsfehler. */
  errors: string[];
  /** Geplanter Agenda-Eintrag. */
  plannedEvent: { title: string; startDate: Date; endDate: Date | null } | null;
  /** Aufbereitete Daten für die Ausführung. */
  payload: PreparedPayload | null;
};

export type PreparedPayload = {
  fields: MappedFields;
  writeFields: Partial<MappedFields>;
  socialLinks: { platform: string; url: string }[];
  sources: { url: string; type: string | null; title: string | null; accessedAt: Date | null }[];
  research: {
    confidenceScore: number | null;
    needsManualReview: boolean;
    reviewReasons: string[];
    activityStatus: string | null;
    lastActivityEvidence: string | null;
    lastVerifiedAt: Date | null;
    dataNotes: string | null;
  };
  cantonId: string;
  nextEdition: {
    year: number | null;
    startDate: Date | null;
    endDate: Date | null;
    sourceUrl: string | null;
    note: string | null;
  } | null;
};

export type PlanSummary = {
  total: number;
  create: number;
  update: number;
  skip: number;
  duplicate: number;
  review: number;
  invalid: number;
  carnivals: number;
  guggen: number;
  events: number;
  averageConfidence: number | null;
  byCanton: Record<string, number>;
};

export type ImportPlan = {
  metadata: Record<string, unknown>;
  records: PlannedRecord[];
  summary: PlanSummary;
  fileErrors: string[];
};

/** Ergebnis der reinen Dateiprüfung. */
export type ParsedFile =
  | { ok: true; metadata: Record<string, unknown>; organizations: unknown[] }
  | { ok: false; errors: string[] };

/** Prüft die Datei strukturell, bevor einzelne Datensätze betrachtet werden. */
export function parseImportFile(raw: string): ParsedFile {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (error) {
    return {
      ok: false,
      errors: [
        `Die Datei ist kein gültiges JSON: ${(error as Error).message}`,
      ],
    };
  }

  const parsed = importFileSchema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => {
        const path = issue.path.join(".");
        return path ? `${path}: ${issue.message}` : issue.message;
      }),
    };
  }

  return {
    ok: true,
    metadata: (parsed.data.metadata ?? {}) as Record<string, unknown>,
    organizations: parsed.data.organizations,
  };
}

/** Lädt den Bestand einmalig in eine kompakte Form für die Dublettensuche. */
export async function loadExistingOrganizations(): Promise<ExistingOrganization[]> {
  const rows = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      city: true,
      website: true,
      externalImportId: true,
      alternativeNames: true,
      canton: { select: { code: true } },
      socialLinks: { select: { url: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    type: row.type,
    city: row.city,
    cantonCode: row.canton.code,
    website: row.website,
    externalImportId: row.externalImportId,
    alternativeNames: row.alternativeNames,
    socialUrls: row.socialLinks.map((link) => link.url),
  }));
}

/**
 * Leitet den Veröffentlichungsstatus eines neuen Datensatzes ab.
 *
 * Es wird nie automatisch veröffentlicht, wenn die Datenlage unsicher ist.
 */
export function derivePublicationStatus(
  input: {
    confidenceScore: number | null;
    activityStatus: string | null;
    needsManualReview: boolean;
    hasWebsite: boolean;
  },
  options: ImportOptions,
): PublicationStatus {
  if (options.publicationMode === "DRAFT_ONLY") return "DRAFT";

  // Harte Ausschlusskriterien für eine automatische Veröffentlichung.
  if (input.needsManualReview) return "PENDING_REVIEW";
  if (input.activityStatus === "UNCERTAIN") return "PENDING_REVIEW";
  if (input.activityStatus === "INACTIVE") return "DRAFT";
  if (input.confidenceScore === null) return "DRAFT";

  if (input.confidenceScore >= 80 && input.activityStatus === "ACTIVE") {
    return "PUBLISHED";
  }

  if (input.confidenceScore >= 70) return "PENDING_REVIEW";

  return "DRAFT";
}

/** Erzeugt für jeden Datensatz eine geplante Aktion. */
export async function buildImportPlan(
  organizations: unknown[],
  metadata: Record<string, unknown>,
  options: ImportOptions,
): Promise<ImportPlan> {
  const [existing, cantons] = await Promise.all([
    loadExistingOrganizations(),
    prisma.canton.findMany({ select: { id: true, code: true } }),
  ]);

  const cantonByCode = new Map(cantons.map((c) => [c.code, c.id]));
  const index = buildDuplicateIndex(existing);

  // Innerhalb einer Datei doppelt vorkommende Kennungen und Slugs erkennen.
  const seenImportIds = new Set<string>();
  const seenSlugs = new Set<string>();

  const records: PlannedRecord[] = [];

  for (const raw of organizations) {
    records.push(
      await planRecord(raw, {
        index,
        cantonByCode,
        options,
        seenImportIds,
        seenSlugs,
      }),
    );
  }

  return {
    metadata,
    records,
    summary: summarise(records),
    fileErrors: [],
  };
}

type PlanContext = {
  index: DuplicateIndex;
  cantonByCode: Map<string, string>;
  options: ImportOptions;
  seenImportIds: Set<string>;
  seenSlugs: Set<string>;
};

function invalidRecord(
  partial: Partial<PlannedRecord>,
  errors: string[],
): PlannedRecord {
  return {
    importId: partial.importId ?? "(ohne Kennung)",
    name: partial.name ?? "(ohne Namen)",
    type: partial.type ?? "CARNIVAL",
    city: partial.city ?? "",
    cantonCode: partial.cantonCode ?? "",
    slug: partial.slug ?? "",
    confidenceScore: partial.confidenceScore ?? null,
    activityStatus: partial.activityStatus ?? null,
    needsManualReview: partial.needsManualReview ?? false,
    action: "INVALID",
    message: errors[0] ?? "Ungültiger Datensatz.",
    publicationStatus: "DRAFT",
    match: null,
    existingLabel: null,
    organizationId: null,
    changedFields: [],
    protectedFields: [],
    errors,
    plannedEvent: null,
    payload: null,
  };
}

async function planRecord(raw: unknown, ctx: PlanContext): Promise<PlannedRecord> {
  const parsed = importOrganizationSchema.safeParse(raw);

  if (!parsed.success) {
    const errors = parsed.error.issues.map((issue) => {
      const path = issue.path.join(".");
      return path ? `${path}: ${issue.message}` : issue.message;
    });
    const candidate = raw as Record<string, unknown> | null;
    return invalidRecord(
      {
        importId: typeof candidate?.importId === "string" ? candidate.importId : undefined,
        name: typeof candidate?.name === "string" ? candidate.name : undefined,
      },
      errors,
    );
  }

  const input = parsed.data;
  const type = mapOrganizationType(input.organizationType);
  const fields = mapOrganization(input);
  const slug = proposeSlug(input);
  const cantonCode = input.location.canton;
  const cantonId = ctx.cantonByCode.get(cantonCode);

  const base = {
    importId: input.importId,
    name: input.name,
    type,
    city: fields.city,
    cantonCode,
    slug,
    confidenceScore: input.confidenceScore,
    activityStatus: input.activity?.activityStatus ?? null,
    needsManualReview: input.needsManualReview,
  };

  if (!cantonId) {
    return invalidRecord(base, [`Unbekannter Kanton: ${cantonCode}`]);
  }

  // Innerhalb der Datei doppelte Kennungen führen zum Überspringen,
  // damit nicht zwei Datensätze dieselbe Organisation beschreiben.
  if (ctx.seenImportIds.has(input.importId)) {
    return {
      ...base,
      action: "SKIP",
      message: "Diese Import-Kennung kommt in der Datei mehrfach vor.",
      publicationStatus: "DRAFT",
      match: null,
      existingLabel: null,
      organizationId: null,
      changedFields: [],
      protectedFields: [],
      errors: [],
      plannedEvent: null,
      payload: null,
    };
  }
  ctx.seenImportIds.add(input.importId);

  const socialLinks = mapSocialLinks(input);
  const match = findDuplicate(
    {
      importId: input.importId,
      name: input.name,
      slug,
      type,
      city: fields.city,
      cantonCode,
      website: fields.website,
      alternativeNames: input.alternativeNames,
      socialUrls: socialLinks.map((link) => link.url),
    },
    ctx.index,
  );

  const payload: PreparedPayload = {
    fields,
    writeFields: withoutEmptyValues(fields),
    socialLinks,
    sources: input.sources
      .filter((source): source is typeof source & { url: string } => Boolean(source.url))
      .map((source) => ({
        url: source.url,
        type: source.type ?? null,
        title: source.title ?? null,
        accessedAt: source.accessedAt ?? null,
      })),
    research: {
      confidenceScore: input.confidenceScore,
      needsManualReview: input.needsManualReview,
      reviewReasons: input.reviewReasons,
      activityStatus: input.activity?.activityStatus ?? null,
      lastActivityEvidence: input.activity?.lastActivityEvidence ?? null,
      lastVerifiedAt: input.activity?.lastVerifiedAt ?? null,
      dataNotes: input.dataNotes,
    },
    cantonId,
    nextEdition: input.carnival?.nextEdition
      ? {
          year: input.carnival.nextEdition.year ?? null,
          startDate: input.carnival.nextEdition.startDate ?? null,
          endDate: input.carnival.nextEdition.endDate ?? null,
          sourceUrl: input.carnival.nextEdition.sourceUrl ?? null,
          note: input.carnival.nextEdition.note ?? null,
        }
      : null,
  };

  const plannedEvent = planEvent(base.name, payload, ctx.options);

  // Mögliche Dubletten werden grundsätzlich nicht automatisch verarbeitet.
  if (match?.kind === "POSSIBLE") {
    return {
      ...base,
      action: "DUPLICATE",
      message: "Möglicher Treffer im Bestand – bitte manuell prüfen.",
      publicationStatus: "DRAFT",
      match,
      existingLabel: match.label,
      organizationId: null,
      changedFields: [],
      protectedFields: [],
      errors: [],
      plannedEvent: null,
      payload,
    };
  }

  if (match?.kind === "EXACT") {
    if (ctx.options.mode === "CREATE_ONLY") {
      return {
        ...base,
        action: "SKIP",
        message: "Bereits vorhanden – der gewählte Modus legt nur neue Datensätze an.",
        publicationStatus: "DRAFT",
        match,
        existingLabel: match.label,
        organizationId: match.organizationId,
        changedFields: [],
        protectedFields: [],
        errors: [],
        plannedEvent: null,
        payload,
      };
    }

    const diff = await diffAgainstExisting(match.organizationId, payload.writeFields);

    return {
      ...base,
      action: "UPDATE",
      message:
        diff.changedFields.length === 0 && diff.protectedFields.length === 0
          ? "Keine Änderungen gegenüber dem Bestand."
          : null,
      publicationStatus: "DRAFT",
      match,
      existingLabel: match.label,
      organizationId: match.organizationId,
      changedFields: diff.changedFields,
      protectedFields: diff.protectedFields,
      errors: [],
      plannedEvent,
      payload,
    };
  }

  // Neuanlage: Slug innerhalb der Datei eindeutig halten.
  if (ctx.seenSlugs.has(slug)) {
    return {
      ...base,
      action: "SKIP",
      message: "Dieser Slug kommt in der Datei mehrfach vor.",
      publicationStatus: "DRAFT",
      match: null,
      existingLabel: null,
      organizationId: null,
      changedFields: [],
      protectedFields: [],
      errors: [],
      plannedEvent: null,
      payload,
    };
  }
  ctx.seenSlugs.add(slug);

  const publicationStatus = derivePublicationStatus(
    {
      confidenceScore: input.confidenceScore,
      activityStatus: payload.research.activityStatus,
      needsManualReview: input.needsManualReview,
      hasWebsite: Boolean(fields.website),
    },
    ctx.options,
  );

  // Datensätze mit Prüfbedarf werden gesondert ausgewiesen, aber angelegt.
  const action: ImportRecordAction = input.needsManualReview ? "REVIEW" : "CREATE";

  return {
    ...base,
    action,
    message: input.needsManualReview
      ? input.reviewReasons[0] ?? "Manuelle Prüfung angefordert."
      : null,
    publicationStatus,
    match: null,
    existingLabel: null,
    organizationId: null,
    changedFields: Object.keys(payload.writeFields),
    protectedFields: [],
    errors: [],
    plannedEvent,
    payload,
  };
}

/**
 * Vergleicht Importwerte mit dem Bestand und berücksichtigt dabei die
 * Feldherkunft: manuell bearbeitete Felder werden nie überschrieben.
 */
async function diffAgainstExisting(
  organizationId: string,
  writeFields: Partial<MappedFields>,
): Promise<{ changedFields: string[]; protectedFields: PlannedFieldConflict[] }> {
  const [current, origins] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId } }),
    prisma.fieldOrigin.findMany({
      where: { organizationId },
      select: { field: true, origin: true },
    }),
  ]);

  if (!current) return { changedFields: [], protectedFields: [] };

  const originByField = new Map(origins.map((o) => [o.field, o.origin]));
  const record = current as unknown as Record<string, unknown>;

  const changedFields: string[] = [];
  const protectedFields: PlannedFieldConflict[] = [];

  for (const key of MAPPED_FIELD_KEYS) {
    if (!(key in writeFields)) continue;
    const importValue = writeFields[key];
    const currentValue = record[key];

    if (valuesEqual(currentValue, importValue)) continue;

    const origin = originByField.get(key);
    if (origin === "ADMIN_EDITED" || origin === "ORGANIZATION_EDITED") {
      protectedFields.push({
        field: key,
        currentValue: serialise(currentValue),
        importValue: serialise(importValue),
        origin,
      });
      continue;
    }

    changedFields.push(key);
  }

  return { changedFields, protectedFields };
}

function serialise(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  return value ?? null;
}

/** Prüft, ob aus der nächsten Ausgabe ein Agenda-Eintrag entstehen kann. */
function planEvent(
  name: string,
  payload: PreparedPayload,
  options: ImportOptions,
): PlannedRecord["plannedEvent"] {
  if (!options.importEvents) return null;

  const edition = payload.nextEdition;
  // Ohne eindeutiges Startdatum entsteht kein Termin.
  if (!edition?.startDate) return null;

  // Termine in der Vergangenheit werden nicht angelegt.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = edition.endDate ?? edition.startDate;
  if (end < today) return null;

  if (edition.endDate && edition.endDate < edition.startDate) return null;

  const year = edition.year ?? edition.startDate.getUTCFullYear();

  return {
    title: `${name} ${year}`,
    startDate: edition.startDate,
    endDate: edition.endDate,
  };
}

function summarise(records: PlannedRecord[]): PlanSummary {
  const summary: PlanSummary = {
    total: records.length,
    create: 0,
    update: 0,
    skip: 0,
    duplicate: 0,
    review: 0,
    invalid: 0,
    carnivals: 0,
    guggen: 0,
    events: 0,
    averageConfidence: null,
    byCanton: {},
  };

  let confidenceSum = 0;
  let confidenceCount = 0;

  for (const record of records) {
    switch (record.action) {
      case "CREATE":
        summary.create += 1;
        break;
      case "UPDATE":
        summary.update += 1;
        break;
      case "SKIP":
        summary.skip += 1;
        break;
      case "DUPLICATE":
        summary.duplicate += 1;
        break;
      case "REVIEW":
        summary.review += 1;
        break;
      case "INVALID":
      case "FAILED":
        summary.invalid += 1;
        break;
    }

    if (record.action !== "INVALID") {
      if (record.type === "CARNIVAL") summary.carnivals += 1;
      else summary.guggen += 1;

      if (record.cantonCode) {
        summary.byCanton[record.cantonCode] =
          (summary.byCanton[record.cantonCode] ?? 0) + 1;
      }
    }

    if (record.plannedEvent) summary.events += 1;

    if (record.confidenceScore !== null) {
      confidenceSum += record.confidenceScore;
      confidenceCount += 1;
    }
  }

  summary.averageConfidence =
    confidenceCount > 0 ? Math.round(confidenceSum / confidenceCount) : null;

  return summary;
}

/** Für die Anzeige der geplanten Adresse einer neuen Organisation. */
export function previewSlug(name: string): string {
  return slugify(name);
}

export { normaliseUrl };
