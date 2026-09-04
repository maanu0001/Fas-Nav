"use client";

import Image from "next/image";
import { CalendarDays, Globe, Mail, MapPin, Music2, Phone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { SOCIAL_PLATFORM_LABELS } from "@/lib/constants";
import { formatDateRange } from "@/lib/dates";
import type { EditorState } from "@/components/dashboard/editor/types";

/**
 * Live-Vorschau der öffentlichen Seite.
 * Bildet die wesentlichen Elemente der Profilseite nach, damit
 * Änderungen unmittelbar sichtbar werden.
 */
export function OrganizationPreview({
  state,
  type,
  cantonName,
}: {
  state: EditorState;
  type: "CARNIVAL" | "GUGGE";
  cantonName: string;
}) {
  const isCarnival = type === "CARNIVAL";
  const activeSocials = state.socialLinks.filter((link) => link.url.trim());

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white">
      <div className="relative h-32 bg-gradient-to-br from-primary-100 to-secondary sm:h-40">
        {state.header?.url ? (
          <Image src={state.header.url} alt="" fill sizes="600px" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Titelbild
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-primary-950/60 to-transparent" />
      </div>

      <div className="p-4">
        <div className="-mt-10 flex items-end gap-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 border-white bg-white shadow-subtle">
            {state.logo?.url ? (
              <Image src={state.logo.url} alt="" fill sizes="56px" className="object-contain p-1" />
            ) : (
              <div className="flex h-full items-center justify-center font-display text-sm font-bold text-primary-700">
                {(state.name || "FN").slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        <div className="mt-3">
          <Badge variant="secondary">{isCarnival ? "Fasnacht" : "Guggenmusik"}</Badge>
          <h2 className="mt-2 font-display text-lg font-bold text-primary-900">
            {state.name || "Name deiner Organisation"}
          </h2>
          {state.tagline ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{state.tagline}</p>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-700">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              {state.city || "Ort"} · {cantonName}
            </span>

            {isCarnival && state.startDate ? (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                {formatDateRange(state.startDate, state.endDate || null)}
              </span>
            ) : null}

            {!isCarnival && state.foundedYear ? (
              <span className="inline-flex items-center gap-1">
                <Music2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                seit {state.foundedYear}
              </span>
            ) : null}
          </div>
        </div>

        {state.shortDescription ? (
          <p className="mt-4 border-t border-border pt-4 text-sm leading-relaxed text-slate-600">
            {state.shortDescription}
          </p>
        ) : null}

        {state.description ? (
          <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
            {state.description
              .split(/\n{2,}/)
              .filter(Boolean)
              .slice(0, 3)
              .map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
          </div>
        ) : null}

        {state.contactEmail || state.contactPhone || state.website ? (
          <div className="mt-4 rounded-lg bg-muted/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Kontakt
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-700">
              {state.contactEmail ? (
                <li className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="truncate">{state.contactEmail}</span>
                </li>
              ) : null}
              {state.contactPhone ? (
                <li className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  {state.contactPhone}
                </li>
              ) : null}
              {state.website ? (
                <li className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="truncate">{state.website}</span>
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}

        {activeSocials.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {activeSocials.map((link) => (
              <span
                key={link.platform}
                className="rounded-full border border-border px-2.5 py-1 text-xs text-slate-700"
              >
                {link.label || SOCIAL_PLATFORM_LABELS[link.platform]}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
