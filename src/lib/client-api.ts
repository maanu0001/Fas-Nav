"use client";

export type ApiFailure = {
  message: string;
  status: number;
  fields?: Record<string, string>;
};

export class ApiError extends Error implements ApiFailure {
  readonly status: number;
  readonly fields?: Record<string, string>;

  constructor(failure: ApiFailure) {
    super(failure.message);
    this.name = "ApiError";
    this.status = failure.status;
    this.fields = failure.fields;
  }
}

/**
 * Einheitlicher Client für alle Mutationen.
 * Validierungsfehler des Servers werden als Feldfehler zurückgegeben,
 * damit Formulare sie direkt anzeigen können.
 */
export async function apiRequest<T = unknown>(
  url: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
    body?: unknown;
    formData?: FormData;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  const { method = "GET", body, formData, signal } = options;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      signal,
      headers: formData ? undefined : body ? { "Content-Type": "application/json" } : undefined,
      body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new ApiError({
      message: "Verbindung zum Server fehlgeschlagen. Bitte versuche es erneut.",
      status: 0,
    });
  }

  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : null;

  if (!response.ok) {
    throw new ApiError({
      message:
        (payload as { error?: string } | null)?.error ??
        "Es ist ein unerwarteter Fehler aufgetreten.",
      status: response.status,
      fields: (payload as { fields?: Record<string, string> } | null)?.fields,
    });
  }

  return payload as T;
}

export function fieldErrors(error: unknown): Record<string, string> {
  return error instanceof ApiError && error.fields ? error.fields : {};
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Es ist ein unerwarteter Fehler aufgetreten.";
}
