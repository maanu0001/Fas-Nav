"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, ExternalLink, Plus, Search, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { EmptyState, Spinner } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { RoleHint, RoleSelect } from "@/components/dashboard/access/role-select";
import { apiRequest, errorMessage } from "@/lib/client-api";
import { formatDateShort } from "@/lib/dates";
import type { MembershipRole, OrganizationType } from "@prisma/client";

export type UserOrganization = {
  id: string;
  role: MembershipRole;
  title: string | null;
  createdAt: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    type: OrganizationType;
    city: string;
    status: string;
    claimStatus: string;
  };
};

type FoundOrganization = {
  id: string;
  name: string;
  city: string;
  type: OrganizationType;
};

function publicHref(org: { type: OrganizationType; slug: string }) {
  return org.type === "CARNIVAL" ? `/fasnacht/${org.slug}` : `/gugge/${org.slug}`;
}

/**
 * Bereich „Zugewiesene Organisationen“ auf der Benutzerseite.
 * Gegenstück zu „Benutzer & Zugriffe“ – dieselbe Zuordnung aus Sicht des Kontos.
 */
export function UserOrganizations({
  userId,
  userName,
  memberships,
}: {
  userId: string;
  userName: string;
  memberships: UserOrganization[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [addOpen, setAddOpen] = React.useState(false);
  const [removeTarget, setRemoveTarget] = React.useState<UserOrganization | null>(null);
  const [pending, setPending] = React.useState(false);

  async function changeRole(entry: UserOrganization, role: MembershipRole) {
    try {
      await apiRequest(
        `/api/organizations/${entry.organization.id}/members/${entry.id}`,
        { method: "PATCH", body: { role } },
      );
      toast(`Berechtigung für ${entry.organization.name} geändert.`, "success");
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      router.refresh();
    }
  }

  async function removeAccess() {
    if (!removeTarget) return;
    setPending(true);
    try {
      const result = await apiRequest<{ claimStatus: string | null }>(
        `/api/organizations/${removeTarget.organization.id}/members/${removeTarget.id}`,
        { method: "DELETE" },
      );
      toast(
        result.claimStatus === "UNCLAIMED"
          ? `Zugriff entfernt. ${removeTarget.organization.name} gilt nun wieder als nicht beansprucht.`
          : "Zugriff entfernt.",
        "success",
      );
      setRemoveTarget(null);
      router.refresh();
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-base font-semibold">
            <Building2 className="h-4 w-4 text-primary-700" aria-hidden />
            Zugewiesene Organisationen
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Auf diese Fasnachten und Guggen hat {userName} Zugriff. Ein Konto kann mehreren
            Organisationen zugewiesen sein.
          </p>
        </div>

        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus />
          Organisation hinzufügen
        </Button>
      </div>

      {memberships.length ? (
        <ul className="divide-y divide-border">
          {memberships.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/dashboard/organisationen/${entry.organization.id}`}
                    className="font-medium text-primary-800 hover:underline"
                  >
                    {entry.organization.name}
                  </Link>
                  <Badge variant="secondary">
                    {entry.organization.type === "CARNIVAL" ? "Fasnacht" : "Gugge"}
                  </Badge>
                  {entry.title ? (
                    <span className="text-xs text-muted-foreground">{entry.title}</span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {entry.organization.city} · Zugriff seit {formatDateShort(entry.createdAt)}
                </p>
              </div>

              <RoleSelect
                value={entry.role}
                onChange={(role) => changeRole(entry, role)}
                className="h-9 w-40 text-xs"
                aria-label={`Berechtigung für ${entry.organization.name}`}
              />

              <Link
                href={publicHref(entry.organization)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label={`Öffentliche Seite von ${entry.organization.name} öffnen`}
                title="Öffentliche Seite öffnen"
              >
                <ExternalLink className="h-4 w-4" aria-hidden />
              </Link>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setRemoveTarget(entry)}
                aria-label={`Zugriff auf ${entry.organization.name} entfernen`}
                title="Zugriff entfernen"
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={Building2}
          title="Keine Organisation zugewiesen"
          description="Dieses Konto kann sich anmelden, aber noch keine Seite bearbeiten. Weise ihm eine Fasnacht oder Gugge zu."
          action={
            <Button onClick={() => setAddOpen(true)}>
              <Plus />
              Organisation zuweisen
            </Button>
          }
        />
      )}

      <AddOrganizationDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        userId={userId}
        onDone={() => {
          setAddOpen(false);
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        onConfirm={removeAccess}
        pending={pending}
        title="Zugriff entfernen?"
        description={
          removeTarget
            ? `${userName} verliert den Zugriff auf ${removeTarget.organization.name}. Die Organisation und ihre öffentliche Seite bleiben unverändert bestehen.`
            : undefined
        }
        confirmLabel="Zugriff entfernen"
      />
    </Card>
  );
}

/** Organisation suchen und dem Konto zuweisen. */
function AddOrganizationDialog({
  open,
  onClose,
  userId,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [term, setTerm] = React.useState("");
  const [results, setResults] = React.useState<FoundOrganization[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [selected, setSelected] = React.useState<FoundOrganization | null>(null);
  const [role, setRole] = React.useState<MembershipRole>("EDITOR");
  const [title, setTitle] = React.useState("");
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (!open || term.trim().length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await apiRequest<{ organizations: FoundOrganization[] }>(
          `/api/organizations/search?q=${encodeURIComponent(term.trim())}&excludeUserId=${userId}`,
          { signal: controller.signal },
        );
        setResults(data.organizations);
      } catch {
        // Abgebrochene Anfragen werden ignoriert.
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term, open, userId]);

  async function assign() {
    if (!selected) return;
    setPending(true);
    try {
      await apiRequest(`/api/organizations/${selected.id}/members`, {
        method: "POST",
        body: { userId, role, title: title || null },
      });
      toast(`Zugriff auf ${selected.name} erteilt.`, "success");
      setTerm("");
      setSelected(null);
      setTitle("");
      onDone();
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Organisation hinzufügen"
      description="Suche eine Fasnacht oder Gugge und gib diesem Konto Zugriff darauf."
    >
      <div className="space-y-4">
        <Field label="Organisation suchen" htmlFor="org-search">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="org-search"
              value={term}
              onChange={(e) => {
                setTerm(e.target.value);
                setSelected(null);
              }}
              placeholder="Name oder Ort …"
              className="pl-9"
              autoComplete="off"
            />
          </div>
        </Field>

        {searching ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner /> Wird gesucht …
          </p>
        ) : null}

        {!searching && term.trim().length >= 2 && results.length === 0 && !selected ? (
          <p className="text-sm text-muted-foreground">
            Keine passende Organisation gefunden.
          </p>
        ) : null}

        {results.length > 0 && !selected ? (
          <ul className="max-h-56 divide-y divide-border overflow-y-auto rounded-lg border border-border">
            {results.map((org) => (
              <li key={org.id}>
                <button
                  type="button"
                  onClick={() => setSelected(org)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-secondary"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{org.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {org.city}
                    </span>
                  </span>
                  <Badge variant="secondary">
                    {org.type === "CARNIVAL" ? "Fasnacht" : "Gugge"}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {selected ? (
          <div className="rounded-lg border border-primary-200 bg-primary-50/50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{selected.name}</p>
                <p className="truncate text-xs text-muted-foreground">{selected.city}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                Ändern
              </Button>
            </div>
          </div>
        ) : null}

        <div>
          <Field label="Berechtigung" htmlFor="add-org-role">
            <RoleSelect id="add-org-role" value={role} onChange={setRole} />
          </Field>
          <RoleHint role={role} />
        </div>

        <Field label="Funktion (optional)" htmlFor="add-org-title">
          <Input
            id="add-org-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            placeholder="z.B. Webmaster"
          />
        </Field>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button onClick={assign} disabled={!selected || pending}>
            {pending ? <Spinner /> : null}
            Zugriff erteilen
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
