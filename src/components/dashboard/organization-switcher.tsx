"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { MEMBERSHIP_ROLE_LABELS } from "@/lib/constants";
import { apiRequest, errorMessage } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import type { MembershipRole, OrganizationType } from "@prisma/client";

export type SwitcherOrganization = {
  id: string;
  name: string;
  slug: string;
  type: OrganizationType;
  statusLabel: string;
  published: boolean;
  membershipRole: MembershipRole;
};

function publicHref(org: SwitcherOrganization) {
  return org.type === "CARNIVAL" ? `/fasnacht/${org.slug}` : `/gugge/${org.slug}`;
}

/**
 * Wechsel zwischen den Organisationen eines Kontos.
 *
 * Bei nur einer Zuweisung wird die Organisation lediglich angezeigt.
 * Der Wechsel wird serverseitig gegen die Zuweisungen geprüft.
 */
export function OrganizationSwitcher({
  organizations,
  activeId,
}: {
  organizations: SwitcherOrganization[];
  activeId: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState<string | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const active = organizations.find((org) => org.id === activeId) ?? organizations[0];

  // Menü bei Klick ausserhalb und mit Escape schliessen.
  React.useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function switchTo(organizationId: string) {
    if (organizationId === activeId) {
      setOpen(false);
      return;
    }
    setPending(organizationId);
    try {
      await apiRequest("/api/account/active-organization", {
        method: "POST",
        body: { organizationId },
      });
      setOpen(false);
      // Serverkomponenten neu laden, damit alle Ansichten die neue
      // Organisation verwenden.
      router.refresh();
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      setPending(null);
    }
  }

  if (!active) return null;

  const single = organizations.length <= 1;

  return (
    <div ref={containerRef} className="relative mx-3 mt-4">
      <p className="mb-1.5 px-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-white/60">
        Aktive Organisation
      </p>

      <button
        type="button"
        onClick={() => !single && setOpen((v) => !v)}
        disabled={single}
        aria-haspopup={single ? undefined : "listbox"}
        aria-expanded={single ? undefined : open}
        className={cn(
          "w-full rounded-lg bg-white/5 p-3 text-left transition-colors",
          !single && "hover:bg-white/10",
          single && "cursor-default",
        )}
      >
        <span className="flex items-start gap-2">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-white">
              {active.name}
            </span>
            <span className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge variant={active.published ? "success" : "warning"}>
                {active.statusLabel}
              </Badge>
              <span className="text-[0.65rem] text-white/60">
                {MEMBERSHIP_ROLE_LABELS[active.membershipRole]}
              </span>
            </span>
          </span>
          {!single ? (
            <ChevronsUpDown className="mt-0.5 h-4 w-4 shrink-0 text-white/60" aria-hidden />
          ) : null}
        </span>
      </button>

      {!single && open ? (
        <ul
          role="listbox"
          aria-label="Organisation wechseln"
          className="absolute inset-x-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-lg border border-white/10 bg-brand p-1 shadow-lift"
        >
          {organizations.map((org) => {
            const isActive = org.id === activeId;
            return (
              <li key={org.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => switchTo(org.id)}
                  disabled={pending !== null}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-left transition-colors",
                    isActive ? "bg-white/10" : "hover:bg-white/10",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-white">
                      {org.name}
                    </span>
                    <span className="block text-[0.65rem] text-white/60">
                      {org.type === "CARNIVAL" ? "Fasnacht" : "Gugge"} ·{" "}
                      {MEMBERSHIP_ROLE_LABELS[org.membershipRole]}
                    </span>
                  </span>
                  {pending === org.id ? (
                    <Spinner className="mt-0.5 h-3.5 w-3.5 text-white" />
                  ) : isActive ? (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-accent" aria-hidden />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <a
        href={publicHref(active)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1.5 px-1 text-xs font-medium text-white/75 transition-colors hover:text-white"
      >
        Vorschau öffnen
        <ExternalLink className="h-3 w-3" aria-hidden />
      </a>
    </div>
  );
}
