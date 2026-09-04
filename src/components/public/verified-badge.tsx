import { BadgeCheck, ShieldCheck } from "lucide-react";
import type { ClaimStatus, VerificationStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Sichtbares Verifizierungszeichen für geprüfte Organisationen. */
export function VerifiedBadge({
  status,
  className,
  showLabel = true,
}: {
  status: VerificationStatus;
  className?: string;
  showLabel?: boolean;
}) {
  if (status === "UNVERIFIED") return null;

  const official = status === "OFFICIAL";
  const Icon = official ? ShieldCheck : BadgeCheck;
  const label = official ? "Offiziell" : "Verifiziert";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold",
        official ? "text-primary-700" : "text-sky-700",
        className,
      )}
      title={
        official
          ? "Offizieller Auftritt der Organisation, bestätigt durch Fas-Nav.ch"
          : "Die Angaben dieser Organisation wurden durch Fas-Nav.ch geprüft"
      }
    >
      <Icon className="h-4 w-4" aria-hidden />
      {showLabel ? label : <span className="sr-only">{label}</span>}
    </span>
  );
}

/** Weist Besucher darauf hin, dass ein Profil noch nicht übernommen wurde. */
export function ClaimBadge({ status }: { status: ClaimStatus }) {
  if (status !== "UNCLAIMED") return null;
  return (
    <Badge variant="muted" title="Dieses Profil wurde von Fas-Nav.ch erstellt und noch nicht von der Organisation übernommen.">
      Nicht beansprucht
    </Badge>
  );
}
