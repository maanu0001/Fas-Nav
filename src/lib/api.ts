import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError, type ZodType, type ZodTypeDef } from "zod";

import { AuthError } from "@/lib/rbac";

export type ApiErrorBody = {
  error: string;
  /** Feldbezogene Validierungsfehler für Formulare. */
  fields?: Record<string, string>;
};

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status = 400, fields?: Record<string, string>) {
  return NextResponse.json<ApiErrorBody>({ error: message, ...(fields ? { fields } : {}) }, { status });
}

function zodFields(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "_";
    if (!fields[path]) fields[path] = issue.message;
  }
  return fields;
}

/**
 * Übersetzt bekannte Fehler in saubere HTTP-Antworten.
 * Interne Details werden niemals an den Client ausgegeben.
 */
export function handleApiError(error: unknown) {
  if (error instanceof AuthError) {
    return jsonError(error.message, error.status);
  }

  if (error instanceof ZodError) {
    return jsonError("Bitte überprüfe deine Eingaben.", 422, zodFields(error));
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = (error.meta?.target as string[] | undefined)?.join(", ");
      return jsonError(
        target?.includes("slug")
          ? "Dieser Slug ist bereits vergeben. Bitte wähle einen anderen."
          : "Dieser Eintrag existiert bereits.",
        409,
      );
    }
    if (error.code === "P2025") {
      return jsonError("Der Datensatz wurde nicht gefunden.", 404);
    }
    if (error.code === "P2003") {
      return jsonError("Der Datensatz wird noch verwendet und kann nicht gelöscht werden.", 409);
    }
  }

  console.error("[api] Unerwarteter Fehler:", error);
  return jsonError("Es ist ein unerwarteter Fehler aufgetreten.", 500);
}

/**
 * Liest und validiert einen JSON-Body.
 * Der Rückgabetyp entspricht dem Zod-*Output*, damit `.default()` und
 * `.transform()` korrekt als nicht-optional typisiert werden.
 */
export async function parseBody<Output, Input>(
  request: Request,
  schema: ZodType<Output, ZodTypeDef, Input>,
): Promise<Output> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ZodError([
      { code: "custom", path: [], message: "Ungültiger Request-Body." },
    ]);
  }
  return schema.parse(raw);
}

/** Validiert Query-Parameter. */
export function parseQuery<Output, Input>(
  request: Request,
  schema: ZodType<Output, ZodTypeDef, Input>,
): Output {
  const url = new URL(request.url);
  const raw: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    raw[key] = value;
  });
  return schema.parse(raw);
}

/** Kapselt einen Route Handler mit einheitlichem Error Handling. */
export function route<Args extends unknown[]>(
  handler: (request: Request, ...args: Args) => Promise<Response>,
) {
  return async (request: Request, ...args: Args): Promise<Response> => {
    try {
      return await handler(request, ...args);
    } catch (error) {
      return handleApiError(error);
    }
  };
}
