"use client";

import { useEffect } from "react";
import type { PageViewTarget } from "@prisma/client";

/**
 * Meldet einen Seitenaufruf genau einmal pro Mount.
 * Bewusst clientseitig, damit Bot-Traffic aus dem SSR-Rendering
 * die Statistik nicht verfälscht.
 */
export function ViewTracker({
  target,
  organizationId,
  eventId,
  path,
}: {
  target: PageViewTarget;
  organizationId?: string;
  eventId?: string;
  path: string;
}) {
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, organizationId, eventId, path, interaction: "VIEW" }),
        signal: controller.signal,
      }).catch(() => undefined);
    }, 800);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [target, organizationId, eventId, path]);

  return null;
}
