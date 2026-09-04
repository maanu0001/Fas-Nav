"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Save, Trash2 } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Checkbox, Field, Input, Select } from "@/components/ui/input";
import { Spinner } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { MEMBERSHIP_ROLE_LABELS, ROLE_LABELS } from "@/lib/constants";
import { apiRequest, errorMessage, fieldErrors } from "@/lib/client-api";
import type { MembershipRole, Role } from "@prisma/client";

type Organization = { id: string; name: string; type: string };

/** Formular zum Erstellen und Bearbeiten von Benutzerkonten. */
export function AccountForm({
  userId,
  organizations,
  canManageStaff,
  initial,
  defaultOrganizationId,
}: {
  userId?: string;
  organizations: Organization[];
  canManageStaff: boolean;
  initial?: {
    name: string;
    email: string;
    role: Role;
    phone: string;
    isActive: boolean;
  };
  defaultOrganizationId?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [values, setValues] = React.useState({
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    role: initial?.role ?? ("FASNACHT" as Role),
    phone: initial?.phone ?? "",
    isActive: initial?.isActive ?? true,
    password: "",
    organizationId: defaultOrganizationId ?? "",
    membershipRole: "OWNER" as MembershipRole,
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [newPassword, setNewPassword] = React.useState("");
  const [resetting, setResetting] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  // Team-Accounts dürfen nur Administratoren vergeben.
  const availableRoles = (Object.keys(ROLE_LABELS) as Role[]).filter((role) =>
    canManageStaff ? true : !["SUPERADMIN", "ADMIN", "TEAM"].includes(role),
  );

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setErrors({});
    setFormError(null);

    try {
      if (userId) {
        await apiRequest(`/api/users/${userId}`, {
          method: "PATCH",
          body: {
            name: values.name,
            email: values.email,
            role: values.role,
            phone: values.phone || null,
            isActive: values.isActive,
          },
        });
        toast("Account gespeichert.", "success");
        router.refresh();
      } else {
        const created = await apiRequest<{ id: string }>("/api/users", {
          method: "POST",
          body: {
            name: values.name,
            email: values.email,
            role: values.role,
            phone: values.phone || null,
            isActive: values.isActive,
            password: values.password || undefined,
            organizationId: values.organizationId || null,
            membershipRole: values.membershipRole,
          },
        });
        toast("Account erstellt.", "success");
        router.push(`/dashboard/accounts/${created.id}`);
      }
    } catch (error) {
      setErrors(fieldErrors(error));
      setFormError(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  async function resetPassword() {
    if (!userId || !newPassword) return;
    setResetting(true);
    try {
      await apiRequest(`/api/users/${userId}/password`, {
        method: "POST",
        body: { password: newPassword },
      });
      toast("Passwort zurückgesetzt. Bitte teile es der Person sicher mit.", "success");
      setNewPassword("");
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      setResetting(false);
    }
  }

  async function deleteUser() {
    if (!userId) return;
    setDeleting(true);
    try {
      await apiRequest(`/api/users/${userId}`, { method: "DELETE" });
      toast("Account gelöscht.", "success");
      router.push("/dashboard/accounts");
    } catch (error) {
      toast(errorMessage(error), "error");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="p-5">
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {formError ? <Alert variant="error">{formError}</Alert> : null}

          <Field label="Name" htmlFor="name" required error={errors.name}>
            <Input
              id="name"
              value={values.name}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
              maxLength={120}
              required
            />
          </Field>

          <Field label="E-Mail" htmlFor="email" required error={errors.email}>
            <Input
              id="email"
              type="email"
              value={values.email}
              onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
              maxLength={200}
              required
            />
          </Field>

          <Field label="Telefon" htmlFor="phone" error={errors.phone}>
            <Input
              id="phone"
              type="tel"
              value={values.phone}
              onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
              maxLength={40}
            />
          </Field>

          <Field label="Rolle" htmlFor="role" required error={errors.role}>
            <Select
              id="role"
              value={values.role}
              onChange={(e) => setValues((v) => ({ ...v, role: e.target.value as Role }))}
            >
              {availableRoles.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </Select>
          </Field>

          {!userId ? (
            <>
              <Field
                label="Organisation zuweisen"
                htmlFor="organizationId"
                error={errors.organizationId}
                hint="Nur für Fasnacht- und Guggenaccounts erforderlich."
              >
                <Select
                  id="organizationId"
                  value={values.organizationId}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, organizationId: e.target.value }))
                  }
                >
                  <option value="">Keine Organisation</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </Select>
              </Field>

              {values.organizationId ? (
                <Field label="Rolle in der Organisation" htmlFor="membershipRole">
                  <Select
                    id="membershipRole"
                    value={values.membershipRole}
                    onChange={(e) =>
                      setValues((v) => ({
                        ...v,
                        membershipRole: e.target.value as MembershipRole,
                      }))
                    }
                  >
                    {Object.entries(MEMBERSHIP_ROLE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}

              <Field
                label="Initiales Passwort"
                htmlFor="password"
                error={errors.password}
                hint="Mindestens 10 Zeichen mit Gross-, Kleinbuchstaben und Ziffer. Teile es der Person sicher mit."
              >
                <Input
                  id="password"
                  type="text"
                  value={values.password}
                  onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
                  minLength={10}
                  maxLength={200}
                  autoComplete="off"
                />
              </Field>
            </>
          ) : null}

          <label className="flex items-center gap-2.5 text-sm text-slate-700">
            <Checkbox
              checked={values.isActive}
              onChange={(e) => setValues((v) => ({ ...v, isActive: e.target.checked }))}
            />
            Konto ist aktiv
          </label>

          <Button type="submit" disabled={pending}>
            {pending ? <Spinner /> : <Save />}
            {userId ? "Speichern" : "Account erstellen"}
          </Button>
        </form>
      </Card>

      {userId ? (
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="mb-1 font-display text-base font-semibold">Passwort zurücksetzen</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Setze ein neues Passwort und teile es der Person über einen sicheren Kanal mit.
              Bestehende Reset-Links werden dabei ungültig.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Neues Passwort"
                minLength={10}
                maxLength={200}
                autoComplete="off"
                aria-label="Neues Passwort"
              />
              <Button
                onClick={resetPassword}
                disabled={resetting || newPassword.length < 10}
                variant="outline"
              >
                {resetting ? <Spinner /> : <KeyRound />}
                Setzen
              </Button>
            </div>
          </Card>

          <Card className="border-red-200 p-5">
            <h2 className="mb-1 font-display text-base font-semibold text-red-900">
              Account löschen
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Besser: Konto deaktivieren. Beim Löschen gehen die Zuordnungen dieses Kontos
              unwiderruflich verloren.
            </p>
            <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 />
              Account löschen
            </Button>
          </Card>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={deleteUser}
        pending={deleting}
        title="Account wirklich löschen?"
        description="Der Zugang wird unwiderruflich entfernt. Erstellte Inhalte bleiben erhalten."
      />
    </div>
  );
}
