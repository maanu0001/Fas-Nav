"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";

const MODES = [
  { value: "light", label: "Hell", Icon: Sun },
  { value: "dark", label: "Dunkel", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;

/**
 * Umschalter für Hell, Dunkel und System.
 *
 * Vor der Hydration ist die tatsächliche Einstellung nicht bekannt – der
 * Server kennt weder die gespeicherte Auswahl noch die Systemvorgabe. Bis
 * dahin wird deshalb ein Platzhalter gleicher Grösse gezeigt: Das vermeidet
 * einen Sprung im Layout und Warnungen aus der Hydration.
 */
export function ThemeToggle({
  className,
  tone = "light",
}: {
  className?: string;
  /** "dark" für dauerhaft dunkle Flächen wie die Seitenleiste. */
  tone?: "light" | "dark";
}) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const base =
    tone === "dark"
      ? "border-white/15 bg-white/5"
      : "border-border bg-secondary";

  if (!mounted) {
    return (
      <div
        className={cn("inline-flex h-8 w-[7.5rem] rounded-lg border", base, className)}
        aria-hidden
      />
    );
  }

  return (
    <div
      className={cn("inline-flex h-8 items-center gap-0.5 rounded-lg border p-0.5", base, className)}
      role="radiogroup"
      aria-label="Farbschema"
    >
      {MODES.map(({ value, label, Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              "inline-flex h-7 w-9 items-center justify-center rounded-md transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : tone === "dark"
                  ? "text-white/60 hover:bg-white/10 hover:text-white"
                  : "text-muted-foreground hover:bg-background hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            <span className="sr-only">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
