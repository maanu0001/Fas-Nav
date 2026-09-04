import type { ImportRecordAction, OrganizationType, PublicationStatus } from "@prisma/client";

export type AnalysedRecord = {
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
  message: string | null;
  publicationStatus: PublicationStatus;
  existingLabel: string | null;
  matchReason: string | null;
  matchKind: "EXACT" | "POSSIBLE" | null;
  changedFields: string[];
  protectedFields: {
    field: string;
    currentValue: unknown;
    importValue: unknown;
    origin: "ADMIN_EDITED" | "ORGANIZATION_EDITED";
  }[];
  errors: string[];
  plannedEvent: { title: string; startDate: string } | null;
};

export type AnalysisSummary = {
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

export type AnalysisResponse = {
  filename: string;
  fileSize: number;
  fileHash: string;
  metadata: Record<string, unknown>;
  summary: AnalysisSummary;
  records: AnalysedRecord[];
};

export type RunResponse = {
  jobId: string;
  reference: string;
  dryRun: boolean;
  result: {
    created: number;
    updated: number;
    skipped: number;
    failed: number;
    duplicates: number;
    review: number;
    invalid: number;
    events: number;
  };
};
