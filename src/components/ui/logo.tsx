import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * FN-Signet aus dem Fas-Nav-Logo.
 *
 * Das vollständige Logo ist für kleine Flächen zu fein gezeichnet. Dieses
 * Zeichen übernimmt daraus die Buchstabenform und die drei Fasnachtsfarben.
 * Es wird bewusst als eingebettetes SVG gezeichnet und nicht als Bilddatei
 * geladen: So folgt die Trägerfläche der Variante und das Zeichen bleibt auf
 * hellem wie dunklem Grund erkennbar.
 */
export function LogoMark({
  className,
  variant = "dark",
}: {
  className?: string;
  /** dark: Navy-Fläche · light: helle Fläche für dunklen Grund · plain: ohne Fläche */
  variant?: "dark" | "light" | "plain";
}) {
  const tile =
    variant === "dark" ? "#0B1A30" : variant === "light" ? "#F2F6FB" : "transparent";
  const letters = variant === "dark" ? "#F7FAFC" : variant === "light" ? "#0B1A30" : "currentColor";

  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("shrink-0", className)}
      aria-hidden
      focusable="false"
    >
      {variant === "plain" ? (
        <rect
          x="1"
          y="1"
          width="62"
          height="62"
          rx="13"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.25"
          strokeWidth="2"
        />
      ) : (
        <rect width="64" height="64" rx="14" fill={tile} />
      )}

      <g fill={letters}>
        <rect x="12" y="18" width="7" height="28" rx="1" />
        <rect x="12" y="18" width="18" height="6.5" rx="1" />
        <rect x="12" y="28.5" width="15" height="6" rx="1" />
        <rect x="34" y="18" width="7" height="28" rx="1" />
        <rect x="47" y="18" width="7" height="28" rx="1" />
        <polygon points="34,18 41,18 54,46 47,46" />
      </g>

      {/* Rot, Gold und Blau des Logos als Akzentkante. */}
      <g>
        <rect x="12" y="50" width="14" height="4" rx="2" fill="#C2171F" />
        <rect x="27" y="50" width="14" height="4" rx="2" fill="#FEAA19" />
        <rect x="42" y="50" width="12" height="4" rx="2" fill="#0279AD" />
      </g>
    </svg>
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
      <LogoMark className="h-9 w-9" variant={variant} />
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
