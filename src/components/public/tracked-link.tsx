"use client";

import * as React from "react";
import type { InteractionType } from "@prisma/client";

/**
 * Externer Link mit anonymer Klickmessung.
 * Der Beacon läuft im Hintergrund und blockiert die Navigation nicht;
 * schlägt er fehl, funktioniert der Link unverändert weiter.
 */
export function TrackedLink({
  href,
  organizationId,
  eventId,
  interaction,
  meta,
  className,
  children,
}: {
  href: string;
  organizationId?: string;
  eventId?: string;
  interaction: InteractionType;
  meta?: string;
  className?: string;
  children: React.ReactNode;
}) {
  function onClick() {
    try {
      const payload = JSON.stringify({ organizationId, eventId, interaction, meta });
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));
      } else {
        void fetch("/api/track", {
          method: "POST",
          body: payload,
          headers: { "Content-Type": "application/json" },
          keepalive: true,
        });
      }
    } catch {
      // Tracking ist optional – Fehler dürfen den Klick nicht beeinträchtigen.
    }
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      onClick={onClick}
      className={className}
    >
      {children}
    </a>
  );
}
