import { qualityBand } from "@/lib/data-quality";
import { cn } from "@/lib/utils";

/**
 * Datenqualität als Zahl mit Balken.
 *
 * Die Einstufung ist zusätzlich am Text ablesbar und nicht nur an der Farbe –
 * sonst wäre sie für Menschen mit Farbsinnschwäche nicht zu unterscheiden.
 */
export function QualityScore({ score, className }: { score: number; className?: string }) {
  const band = qualityBand(score);

  const bar = {
    good: "bg-emerald-500",
    medium: "bg-amber-500",
    poor: "bg-red-500",
  }[band];

  const label = {
    good: "gut",
    medium: "mittel",
    poor: "lückenhaft",
  }[band];

  return (
    <div className={cn("min-w-[7.5rem]", className)}>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-sm font-semibold tabular-nums text-foreground">
          {score} %
        </span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div
        className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`Datenqualität ${score} von 100 Prozent, ${label}`}
      >
        <div className={cn("h-full rounded-full", bar)} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}
