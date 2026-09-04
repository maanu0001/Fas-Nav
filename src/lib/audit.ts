import { headers } from "next/headers";

import { prisma } from "@/lib/prisma";

type AuditInput = {
  userId?: string | null;
  userLabel?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  entityLabel?: string | null;
  before?: unknown;
  after?: unknown;
};

/** Entfernt sensible Felder, bevor Zustände protokolliert werden. */
const REDACTED_KEYS = new Set(["passwordHash", "password", "tokenHash", "token"]);

function sanitize(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.map(sanitize);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (REDACTED_KEYS.has(key)) continue;
      if (val instanceof Date) out[key] = val.toISOString();
      else if (typeof val === "object" && val !== null) out[key] = sanitize(val);
      else out[key] = val;
    }
    return out;
  }
  return value;
}

/**
 * Schreibt einen Audit-Log-Eintrag. Fehler beim Logging dürfen die
 * eigentliche Aktion niemals fehlschlagen lassen.
 */
export async function logAudit(input: AuditInput): Promise<void> {
  try {
    let ip: string | null = null;
    let userAgent: string | null = null;
    try {
      const h = await headers();
      ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
      userAgent = h.get("user-agent");
    } catch {
      // Ausserhalb eines Request-Kontexts (z.B. Seed/Cron) nicht verfügbar.
    }

    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        userLabel: input.userLabel ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        entityLabel: input.entityLabel ?? null,
        before: (sanitize(input.before) ?? undefined) as never,
        after: (sanitize(input.after) ?? undefined) as never,
        ip,
        userAgent: userAgent?.slice(0, 300) ?? null,
      },
    });
  } catch (error) {
    console.error("[audit] Log konnte nicht geschrieben werden:", error);
  }
}
