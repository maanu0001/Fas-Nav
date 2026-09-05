import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

/** Das offizielle Fas-Nav-Logo, ohne weissen Hintergrund. */
export const LOGO_SRC = "/brand/fas-nav-logo-transparent.png";

/**
 * Das offizielle Logo als kompaktes Zeichen.
 *
 * Verwendet wird ausschliesslich die gelieferte Bilddatei; es gibt keine
 * nachgezeichnete Fassung. Das Logo ist für hellen Grund gestaltet, seine
 * Buchstaben sind dunkles Navy. Damit es auf dunklen Markenflächen – Kopf-
 * zeile im dunklen Modus, Seitenleiste, Fusszeile – nicht verschwindet, steht
 * es dort auf einer ruhigen hellen Trägerfläche. Das ist eine gestalterische
 * Fassung des Logos, keine Veränderung: Farben und Proportionen bleiben.
 *
 * "object-contain" mit quadratischem Rahmen hält das Seitenverhältnis; das
 * Logo wird nie verzerrt.
 */
export function LogoMark({
  className,
  variant = "dark",
}: {
  className?: string;
  /** dark: heller Grund vorhanden · light: eigene helle Fläche für dunklen Grund */
  variant?: "dark" | "light" | "plain";
}) {
  const aufHellemGrund = variant === "dark";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl",
        // Auf dunklem Grund trägt eine helle Fläche das Logo.
        aufHellemGrund ? "bg-transparent" : "bg-white/95 p-1 ring-1 ring-white/25",
        className,
      )}
      aria-hidden
    >
      <Image
        src={LOGO_SRC}
        alt=""
        width={128}
        height={128}
        className="h-full w-full object-contain"
        priority
      />
    </span>
  );
}

export function Logo({
  className,
  variant = "dark",
  showWordmark = true,
  href = "/",
}: {
  className?: string;
  variant?: "dark" | "light";
  showWordmark?: boolean;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("group inline-flex items-center gap-2.5", className)}
      aria-label="Fas-Nav.ch – Startseite"
    >
      <LogoMark className="h-10 w-10" variant={variant} />
      {showWordmark ? (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              "font-display text-[1.05rem] font-bold tracking-tight",
              variant === "light" ? "text-white" : "text-foreground",
            )}
          >
            Fas-Nav
            <span className={variant === "light" ? "text-white/55" : "text-muted-foreground"}>
              .ch
            </span>
          </span>
          <span
            className={cn(
              "mt-1 text-[0.62rem] font-medium uppercase tracking-[0.16em]",
              variant === "light" ? "text-white/55" : "text-muted-foreground",
            )}
          >
            Schweizer Fasnacht
          </span>
        </span>
      ) : null}
    </Link>
  );
}
