import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Minimalistisches FN-Monogramm.
 * Bewusst geometrisch gehalten: seriös genug für Gemeinden und Komitees,
 * mit einem einzelnen warmen Akzent als fasnächtlichem Signal.
 */
export function LogoMark({
  className,
  variant = "dark",
}: {
  className?: string;
  variant?: "dark" | "light" | "plain";
}) {
  const bg =
    variant === "dark"
      ? "bg-primary-900 text-white"
      : variant === "light"
        ? "bg-white text-primary-900"
        : "bg-transparent text-current ring-1 ring-current/25";

  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-[0.55rem] font-display text-[0.95em] font-bold leading-none tracking-[-0.06em]",
        bg,
        className,
      )}
    >
      FN
      {/* Akzentkante als dezenter Fasnachtsbezug */}
      <span
        className={cn(
          "absolute bottom-0 left-0 h-[3px] w-full",
          variant === "light" ? "bg-accent-500" : "bg-accent-500",
        )}
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
      <LogoMark className="h-9 w-9 text-lg" variant={variant} />
      {showWordmark ? (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              "font-display text-[1.05rem] font-bold tracking-tight",
              variant === "light" ? "text-white" : "text-primary-900",
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
