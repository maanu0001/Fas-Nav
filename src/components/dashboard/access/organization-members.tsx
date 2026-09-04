"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ShieldAlert, UserPlus, Users, X } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { EmptyState, Spinner } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { RoleHint, RoleSelect } from "@/components/dashboard/access/role-select";
import { MEMBERSHIP_ROLE_LABELS } from "@/lib/constants";
import { apiRequest, errorMessage, fieldErrors } from "@/lib/client-api";
import { formatDateShort } from "@/lib/dates";
import type { MembershipRole } from "@prisma/client";

export type OrganizationMember = {
  id: string;
  role: MembershipRole;
  title: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    lastLoginAt: string | null;
  };
};

type FoundUser = { id: string; name: string; email: string; isActive: boolean };

/**
 * Bereich „Benutzer & Zugriffe“ auf der Organisationsseite.
 * Zeigt alle Konten mit Zugriff und erlaubt Zuweisen, Ändern und Entziehen.
 */
export function OrganizationMembers({
  organizationId,
  organizationName,
  members,
  canSearchExisting,
  canManage,
}: {
  organizationId: string;
  organizationName: string;
  members: OrganizationMember[];
  /** Nur Admin und Team dürfen im Benutzerverzeichnis suchen. */
  canSearchExisting: boolean;
  canManage: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [assignOpen, setAssignOpen] = React.useState(false);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [removeTarget, setRemoveTarget] = React.useState<OrganizationMember | null>(null);
  const [pending, setPending] = React.useState(false);

  async function changeRole(member: OrganizationMember, role: MembershipRole) {
    try {
      await apiRequest(`/api/organizations/${organizationId}/members/${member.id}`, {
        method: "PATCH",
        body: { role },
      });
      toast(`Berechtigung von ${member.user.name} geändert.`, "success");
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      router.refresh();
    }
  }

  async function removeMember() {
    if (!removeTarget) return;
    setPending(true);
    try {
      const result = await apiRequest<{ claimStatus: string | null }>(
        `/api/organizations/${organizationId}/members/${removeTarget.id}`,
        { method: "DELETE" },
      );
      toast(
        result.claimStatus === "UNCLAIMED"
          ? "Zugriff entfernt. Das Profil gilt nun wieder als nicht beansprucht."
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
            <Users className="h-4 w-4 text-primary-700" aria-hidden />
            Benutzer &amp; Zugriffe
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Diese Konten können {organizationName} bearbeiten. Ein Konto kann gleichzeitig
            Zugriff auf mehrere Organisationen haben.
          </p>
        </div>

        {canManage ? (
          <div className="flex flex-wrap gap-2">
            {canSearchExisting ? (
              <Button variant="outline" size="sm" onClick={() => setAssignOpen(true)}>
                <Search />
                Zugriff hinzufügen
              </Button>
            ) : null}
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus />
              Neuen Benutzer erstellen
            </Button>
          </div>
        ) : null}
      </div>

      {members.length ? (
        <ul className="divide-y divide-border">
          {members.map((member) => (
            <li key={member.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/dashboard/accounts/${member.user.id}`}
                    className="font-medium text-primary-800 hover:underline"
                  >
                    {member.user.name}
                  </Link>
                  {member.title ? (
                    <span className="text-xs text-muted-foreground">{member.title}</span>
                  ) : null}
                  {!member.user.isActive ? (
                    <Badge variant="muted">Konto deaktiviert</Badge>
                  ) : null}
                </p>
                <p className="mt-0.5 break-all text-xs text-muted-foreground">
                  {member.user.email} · Zugriff seit {formatDateShort(member.createdAt)}
                  {member.user.lastLoginAt
                    ? ` · zuletzt angemeldet ${formatDateShort(member.user.lastLoginAt)}`
                    : " · noch nie angemeldet"}
                </p>
              </div>

              {canManage ? (
                <>
                  <RoleSelect
                    value={member.role}
                    onChange={(role) => changeRole(member, role)}
                    className="h-9 w-40 text-xs"
                    aria-label={`Berechtigung von ${member.user.name}`}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setRemoveTarget(member)}
                    aria-label={`Zugriff von ${member.user.name} entfernen`}
                    title="Zugriff entfernen"
                  >
                    <X />
                  </Button>
                </>
              ) : (
                <Badge variant="secondary">{MEMBERSHIP_ROLE_LABELS[member.role]}</Badge>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={ShieldAlert}
          title="Noch kein Konto zugewiesen"
          description="Dieses Profil wurde von Fas-Nav.ch angelegt und gilt als nicht beansprucht. Die öffentliche Seite bleibt sichtbar. Sobald sich die Organisation meldet, weist du ihr hier ein Konto zu."
          action={
            canManage ? (
              <Button onClick={() => setInviteOpen(true)}>
                <UserPlus />
                Benutzer erstellen und zuweisen
              </Button>
            ) : undefined
          }
        />
      )}

      {canSearchExisting ? (
        <AssignExistingDialog
          open={assignOpen}
          onClose={() => setAssignOpen(false)}
          organizationId={organizationId}
          onDone={() => {
            setAssignOpen(false);
            router.refresh();
          }}
        />
      ) : null}

      <InviteUserDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        organizationId={organizationId}
        onDone={() => {
          setInviteOpen(false);
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        onConfirm={removeMember}
        pending={pending}
        title="Zugriff entfernen?"
        description={
          removeTarget
            ? `${removeTarget.user.name} verliert den Zugriff auf ${organizationName}. Das Benutzerkonto selbst bleibt bestehen, ebenso die öffentliche Seite der Organisation.`
            : undefined
        }
        confirmLabel="Zugriff entfernen"
      />
    </Card>
  );
}

/** Bestehendes Konto suchen und zuweisen (nur Admin und Team). */
function AssignExistingDialog({
  open,
  onClose,
  organizationId,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [term, setTerm] = React.useState("");
  const [results, setResults] = React.useState<FoundUser[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [selected, setSelected] = React.useState<FoundUser | null>(null);
  const [role, setRole] = React.useState<MembershipRole>("EDITOR");
  const [title, setTitle] = React.useState("");
  const [pending, setPending] = React.useState(false);

  // Suche mit kurzer Verzögerung, damit nicht bei jedem Tastendruck geladen wird.
  React.useEffect(() => {
    if (!open || term.trim().length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await apiRequest<{ users: FoundUser[] }>(
          `/api/users?q=${encodeURIComponent(term.trim())}&excludeOrganizationId=${organizationId}`,
          { signal: controller.signal },
        );
        setResults(data.users);
      } catch {
        // Abgebrochene Anfragen sind erwartbar und werden ignoriert.
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term, open, organizationId]);

  async function assign() {
    if (!selected) return;
    setPending(true);
    try {
      await apiRequest(`/api/organizations/${organizationId}/members`, {
        method: "POST",
        body: { userId: selected.id, role, title: title || null },
      });
      toast(`${selected.name} hat jetzt Zugriff.`, "success");
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
      title="Zugriff hinzufügen"
      description="Suche ein bestehendes Benutzerkonto und gib ihm Zugriff auf diese Organisation."
    >
      <div className="space-y-4">
        <Field label="Benutzer suchen" htmlFor="member-search">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="member-search"
              value={term}
              onChange={(e) => {
                setTerm(e.target.value);
                setSelected(null);
              }}
              placeholder="Name oder E-Mail …"
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
            Kein passendes Konto gefunden. Lege stattdessen einen neuen Benutzer an.
          </p>
        ) : null}

        {results.length > 0 && !selected ? (
          <ul className="max-h-56 divide-y divide-border overflow-y-auto rounded-lg border border-border">
            {results.map((user) => (
              <li key={user.id}>
                <button
                  type="button"
                  onClick={() => setSelected(user)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-secondary"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{user.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </span>
                  {!user.isActive ? <Badge variant="muted">Inaktiv</Badge> : null}
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
                <p className="truncate text-xs text-muted-foreground">{selected.email}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                Ändern
              </Button>
            </div>
          </div>
        ) : null}

        <div>
          <Field label="Berechtigung" htmlFor="assign-role">
            <RoleSelect id="assign-role" value={role} onChange={setRole} />
          </Field>
          <RoleHint role={role} />
        </div>

        <Field
          label="Funktion (optional)"
          htmlFor="assign-title"
          hint="Zum Beispiel Präsidium, Marketing oder Webmaster."
        >
          <Input
            id="assign-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
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

/** Neues Konto anlegen und direkt zuweisen. */
function InviteUserDialog({
  open,
  onClose,
  organizationId,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [role, setRole] = React.useState<MembershipRole>("OWNER");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrors({});
    setFormError(null);

    const data = new FormData(event.currentTarget);

    try {
      await apiRequest(`/api/organizations/${organizationId}/members`, {
        method: "POST",
        body: {
          name: data.get("name"),
          email: data.get("email"),
          password: data.get("password") || undefined,
          role,
          title: data.get("title") || null,
        },
      });
      toast("Benutzer erstellt und zugewiesen.", "success");
      onDone();
    } catch (error) {
      setErrors(fieldErrors(error));
      setFormError(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Neuen Benutzer erstellen"
      description="Das Konto wird angelegt und erhält direkt Zugriff auf diese Organisation."
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {formError ? <Alert variant="error">{formError}</Alert> : null}

        <Field label="Name" htmlFor="invite-name" required error={errors.name}>
          <Input id="invite-name" name="name" required maxLength={120} />
        </Field>

        <Field label="E-Mail" htmlFor="invite-email" required error={errors.email}>
          <Input id="invite-email" name="email" type="email" required maxLength={200} />
        </Field>

        <Field
          label="Initiales Passwort"
          htmlFor="invite-password"
          error={errors.password}
          hint="Mindestens 10 Zeichen mit Gross-, Kleinbuchstaben und Ziffer. Leer lassen, wenn die Person es über „Passwort vergessen“ selbst setzen soll."
        >
          <Input
            id="invite-password"
            name="password"
            type="text"
            minLength={10}
            maxLength={200}
            autoComplete="off"
          />
        </Field>

        <div>
          <Field label="Berechtigung" htmlFor="invite-role">
            <RoleSelect id="invite-role" value={role} onChange={setRole} />
          </Field>
          <RoleHint role={role} />
        </div>

        <Field label="Funktion (optional)" htmlFor="invite-title" error={errors.title}>
          <Input id="invite-title" name="title" maxLength={80} placeholder="z.B. Präsidium" />
        </Field>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner /> : <UserPlus />}
            Erstellen und zuweisen
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
