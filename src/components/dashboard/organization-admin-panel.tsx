"use client";

import * as React from "react";
import Link from "next/link";
import { BadgeCheck, Save, Sparkles, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Checkbox, Field, Input, Select } from "@/components/ui/input";
import { Spinner } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import {
  CLAIM_STATUS_LABELS,
  MEMBERSHIP_ROLE_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
} from "@/lib/constants";
import { apiRequest, errorMessage } from "@/lib/client-api";
import { formatDateShort, toDateInputValue } from "@/lib/dates";
import type {
  ClaimStatus,
  MembershipRole,
  PublicationStatus,
  SubscriptionStatus,
  VerificationStatus,
} from "@prisma/client";

type Plan = { id: string; name: string; key: string; priceChf: number };

type Subscription = {
  id: string;
  planId: string;
  status: SubscriptionStatus;
  priceChf: number;
  startDate: string;
  endDate: string | null;
  nextDueAt: string | null;
  autoRenew: boolean;
  plan: { name: string };
} | null;

type Member = {
  id: string;
  role: MembershipRole;
  title: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    lastLoginAt: Date | null;
  };
};

/**
 * Verwaltungsbereich, der ausschliesslich Admin und Team angezeigt wird.
 * Die entsprechenden Endpoints prüfen die Rolle zusätzlich serverseitig.
 */
export function OrganizationAdminPanel({
  organizationId,
  slug,
  status,
  verification,
  claimStatus,
  isFeatured,
  plans,
  subscription,
  members,
}: {
  organizationId: string;
  slug: string;
  status: PublicationStatus;
  verification: VerificationStatus;
  claimStatus: ClaimStatus;
  isFeatured: boolean;
  plans: Plan[];
  subscription: Subscription;
  members: Member[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [adminState, setAdminState] = React.useState({
    slug,
    status,
    verification,
    claimStatus,
    isFeatured,
  });
  const [subState, setSubState] = React.useState({
    planId: subscription?.planId ?? plans[0]?.id ?? "",
    status: subscription?.status ?? ("TRIAL" as SubscriptionStatus),
    priceChf: subscription ? String(subscription.priceChf) : String(plans[0]?.priceChf ?? 0),
    startDate: toDateInputValue(subscription?.startDate),
    endDate: toDateInputValue(subscription?.endDate),
    nextDueAt: toDateInputValue(subscription?.nextDueAt),
    autoRenew: subscription?.autoRenew ?? true,
  });

  const [savingAdmin, setSavingAdmin] = React.useState(false);
  const [savingSub, setSavingSub] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  async function saveAdmin() {
    setSavingAdmin(true);
    try {
      await apiRequest(`/api/organizations/${organizationId}`, {
        method: "PATCH",
        body: adminState,
      });
      toast("Verwaltungsdaten gespeichert.", "success");
      router.refresh();
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      setSavingAdmin(false);
    }
  }

  async function saveSubscription() {
    setSavingSub(true);
    try {
      await apiRequest(`/api/organizations/${organizationId}/subscription`, {
        method: "PUT",
        body: {
          planId: subState.planId,
          status: subState.status,
          priceChf: subState.priceChf,
          startDate: subState.startDate || null,
          endDate: subState.endDate || null,
          nextDueAt: subState.nextDueAt || null,
          autoRenew: subState.autoRenew,
        },
      });
      toast("Abonnement gespeichert.", "success");
      router.refresh();
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      setSavingSub(false);
    }
  }

  async function deleteOrganization() {
    setDeleting(true);
    try {
      await apiRequest(`/api/organizations/${organizationId}`, { method: "DELETE" });
      toast("Organisation gelöscht.", "success");
      router.push("/dashboard/organisationen");
    } catch (error) {
      toast(errorMessage(error), "error");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="p-5">
        <h2 className="mb-4 flex items-center gap-2 font-display text-base font-semibold">
          <BadgeCheck className="h-4 w-4 text-primary-700" aria-hidden />
          Status und Sichtbarkeit
        </h2>

        <div className="space-y-4">
          <Field
            label="Slug (öffentliche Adresse)"
            htmlFor="slug"
            hint="Achtung: Eine Änderung verändert die öffentliche URL."
          >
            <Input
              id="slug"
              value={adminState.slug}
              onChange={(e) => setAdminState((s) => ({ ...s, slug: e.target.value }))}
              maxLength={90}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Veröffentlichung" htmlFor="status">
              <Select
                id="status"
                value={adminState.status}
                onChange={(e) =>
                  setAdminState((s) => ({ ...s, status: e.target.value as PublicationStatus }))
                }
              >
                <option value="DRAFT">Entwurf</option>
                <option value="PENDING_REVIEW">In Prüfung</option>
                <option value="PUBLISHED">Veröffentlicht</option>
                <option value="UNPUBLISHED">Nicht veröffentlicht</option>
                <option value="SUSPENDED">Gesperrt</option>
              </Select>
            </Field>

            <Field label="Verifizierung" htmlFor="verification">
              <Select
                id="verification"
                value={adminState.verification}
                onChange={(e) =>
                  setAdminState((s) => ({
                    ...s,
                    verification: e.target.value as VerificationStatus,
                  }))
                }
              >
                <option value="UNVERIFIED">Nicht verifiziert</option>
                <option value="VERIFIED">Verifiziert</option>
                <option value="OFFICIAL">Offiziell</option>
              </Select>
            </Field>
          </div>

          <Field label="Übernahmestatus" htmlFor="claimStatus">
            <Select
              id="claimStatus"
              value={adminState.claimStatus}
              onChange={(e) =>
                setAdminState((s) => ({ ...s, claimStatus: e.target.value as ClaimStatus }))
              }
            >
              {Object.entries(CLAIM_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>

          <label className="flex items-center gap-2.5 text-sm">
            <Checkbox
              checked={adminState.isFeatured}
              onChange={(e) => setAdminState((s) => ({ ...s, isFeatured: e.target.checked }))}
            />
            <span className="flex items-center gap-1.5 text-slate-700">
              <Sparkles className="h-3.5 w-3.5 text-accent-600" aria-hidden />
              Hervorgehoben darstellen
            </span>
          </label>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button onClick={saveAdmin} disabled={savingAdmin}>
              {savingAdmin ? <Spinner /> : <Save />}
              Speichern
            </Button>
            <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 />
              Löschen
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 font-display text-base font-semibold">Abonnement und Zahlung</h2>

        {subscription ? (
          <p className="mb-4 text-sm text-muted-foreground">
            Aktuell: <strong>{subscription.plan.name}</strong> ·{" "}
            {SUBSCRIPTION_STATUS_LABELS[subscription.status]}
            {subscription.endDate ? ` · bis ${formatDateShort(subscription.endDate)}` : ""}
          </p>
        ) : (
          <p className="mb-4 text-sm text-muted-foreground">
            Für diese Organisation besteht noch kein Abonnement.
          </p>
        )}

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tarif" htmlFor="planId">
              <Select
                id="planId"
                value={subState.planId}
                onChange={(e) => {
                  const plan = plans.find((p) => p.id === e.target.value);
                  setSubState((s) => ({
                    ...s,
                    planId: e.target.value,
                    // Listenpreis übernehmen, solange kein Sonderpreis gesetzt wurde.
                    priceChf: plan ? String(plan.priceChf) : s.priceChf,
                  }));
                }}
              >
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} (CHF {plan.priceChf})
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Zahlungsstatus" htmlFor="subStatus">
              <Select
                id="subStatus"
                value={subState.status}
                onChange={(e) =>
                  setSubState((s) => ({ ...s, status: e.target.value as SubscriptionStatus }))
                }
              >
                {Object.entries(SUBSCRIPTION_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Preis (CHF)" htmlFor="priceChf">
            <Input
              id="priceChf"
              type="number"
              step="0.05"
              min="0"
              value={subState.priceChf}
              onChange={(e) => setSubState((s) => ({ ...s, priceChf: e.target.value }))}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Start" htmlFor="startDate">
              <Input
                id="startDate"
                type="date"
                value={subState.startDate}
                onChange={(e) => setSubState((s) => ({ ...s, startDate: e.target.value }))}
              />
            </Field>
            <Field label="Ablauf" htmlFor="endDate">
              <Input
                id="endDate"
                type="date"
                value={subState.endDate}
                onChange={(e) => setSubState((s) => ({ ...s, endDate: e.target.value }))}
              />
            </Field>
            <Field label="Nächste Fälligkeit" htmlFor="nextDueAt">
              <Input
                id="nextDueAt"
                type="date"
                value={subState.nextDueAt}
                onChange={(e) => setSubState((s) => ({ ...s, nextDueAt: e.target.value }))}
              />
            </Field>
          </div>

          <label className="flex items-center gap-2.5 text-sm text-slate-700">
            <Checkbox
              checked={subState.autoRenew}
              onChange={(e) => setSubState((s) => ({ ...s, autoRenew: e.target.checked }))}
            />
            Automatisch verlängern
          </label>

          <Button onClick={saveSubscription} disabled={savingSub || !subState.planId}>
            {savingSub ? <Spinner /> : <Save />}
            Abonnement speichern
          </Button>
        </div>
      </Card>

      <Card className="p-5 lg:col-span-2">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-base font-semibold">
            Zugeordnete Accounts ({members.length})
          </h2>
          <Link
            href={`/dashboard/accounts/neu?organizationId=${organizationId}`}
            className="text-sm text-primary-700 hover:underline"
          >
            Account hinzufügen
          </Link>
        </div>

        {members.length ? (
          <ul className="divide-y divide-border">
            {members.map((member) => (
              <li key={member.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-primary-900">
                    {member.user.name}
                    {member.title ? (
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        {member.title}
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{member.user.email}</p>
                </div>
                <Badge variant="secondary">{MEMBERSHIP_ROLE_LABELS[member.role]}</Badge>
                <Badge variant={member.user.isActive ? "success" : "muted"}>
                  {member.user.isActive ? "Aktiv" : "Inaktiv"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {member.user.lastLoginAt
                    ? `zuletzt ${formatDateShort(member.user.lastLoginAt)}`
                    : "noch nie angemeldet"}
                </span>
                <Link
                  href={`/dashboard/accounts/${member.user.id}`}
                  className="text-sm text-primary-700 hover:underline"
                >
                  Bearbeiten
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Dieser Organisation ist noch kein Account zugeordnet. Das Profil gilt damit als nicht
            beansprucht.
          </p>
        )}
      </Card>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={deleteOrganization}
        pending={deleting}
        title="Organisation wirklich löschen?"
        description="Alle Veranstaltungen, Bilder, Sponsoren und das Abonnement dieser Organisation werden unwiderruflich entfernt. Diese Aktion kann nicht rückgängig gemacht werden."
        confirmLabel="Endgültig löschen"
      />
    </div>
  );
}
