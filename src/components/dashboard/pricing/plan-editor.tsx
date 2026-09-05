"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Save, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { apiRequest, errorMessage, fieldErrors } from "@/lib/client-api";
import { BILLING_INTERVAL_LABELS, defaultCtaText, defaultCtaUrl } from "@/lib/pricing";
import type { FeatureRow } from "@/components/dashboard/pricing/feature-manager";

export type PlanFeatureValue = {
  featureId: string;
  enabled: boolean;
  limit: number | null;
  value: string | null;
  note: string | null;
};

export type PlanRow = {
  id: string | null;
  key: string;
  tier: string;
  name: string;
  description: string | null;
  priceChf: number;
  currency: string;
  billingInterval: string;
  ctaText: string | null;
  ctaUrl: string | null;
  isActive: boolean;
  isPublic: boolean;
  isRecommended: boolean;
  trialDays: number;
  sortOrder: number;
  features: PlanFeatureValue[];
  subscriptionCount: number;
};

const TIERS = ["FREE", "BASIC", "PREMIUM", "CUSTOM"];

/**
 * Ein Tarif mit seinen Leistungen und Vergleichswerten.
 *
 * Der Vergleichswert je Leistung kennt drei Zustände: enthalten, nicht
 * enthalten und Freitext. Der Freitext ist reine Anzeige – ob eine Funktion
 * tatsächlich freigeschaltet ist, entscheidet weiterhin das Häkchen und das
 * Limit. Das steht bewusst getrennt, damit ein Text in der Tabelle niemals
 * versehentlich eine Berechtigung erteilt.
 */
export function PlanEditor({
  plan,
  features,
  onClose,
}: {
  plan: PlanRow;
  features: FeatureRow[];
  onClose: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [werte, setWerte] = React.useState<PlanRow>(plan);
  const [pending, setPending] = React.useState(false);
  const [fehler, setFehler] = React.useState<Record<string, string>>({});
  const [loeschen, setLoeschen] = React.useState(false);

  const neu = plan.id === null;

  function setzeFeature(featureId: string, patch: Partial<PlanFeatureValue>) {
    setWerte((w) => {
      const vorhanden = w.features.find((f) => f.featureId === featureId);
      const naechste = vorhanden
        ? w.features.map((f) => (f.featureId === featureId ? { ...f, ...patch } : f))
        : [...w.features, { featureId, enabled: false, limit: null, value: null, note: null, ...patch }];
      return { ...w, features: naechste };
    });
  }

  function feature(featureId: string): PlanFeatureValue {
    return (
      werte.features.find((f) => f.featureId === featureId) ?? {
        featureId,
        enabled: false,
        limit: null,
        value: null,
        note: null,
      }
    );
  }

  async function speichern(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setFehler({});
    try {
      const body = {
        key: werte.key,
        tier: werte.tier,
        name: werte.name,
        description: werte.description || null,
        priceChf: werte.priceChf,
        currency: werte.currency,
        billingInterval: werte.billingInterval,
        ctaText: werte.ctaText || null,
        ctaUrl: werte.ctaUrl || null,
        isActive: werte.isActive,
        isPublic: werte.isPublic,
        isRecommended: werte.isRecommended,
        trialDays: werte.trialDays,
        sortOrder: werte.sortOrder,
        // Nur zugeordnete Leistungen mitschicken: enthalten oder mit eigenem
        // Vergleichswert. Alles andere gilt als „nicht enthalten“.
        features: werte.features.filter((f) => f.enabled || f.value),
      };

      if (neu) await apiRequest("/api/plans", { method: "POST", body });
      else await apiRequest(`/api/plans/${werte.id}`, { method: "PATCH", body });

      toast(neu ? "Tarif angelegt." : "Tarif gespeichert.", "success");
      onClose();
      router.refresh();
    } catch (error) {
      setFehler(fieldErrors(error));
      toast(errorMessage(error), "error");
    } finally {
      setPending(false);
    }
  }

  async function entfernen() {
    setPending(true);
    try {
      const antwort = await apiRequest<{ deactivated: boolean; message?: string }>(
        `/api/plans/${werte.id}`,
        { method: "DELETE" },
      );
      toast(antwort.deactivated ? (antwort.message ?? "Tarif deaktiviert.") : "Tarif gelöscht.", "success");
      setLoeschen(false);
      onClose();
      router.refresh();
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <h2 className="font-display text-base font-semibold">
          {neu ? "Neuer Tarif" : `Tarif bearbeiten: ${plan.name}`}
        </h2>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Bearbeitung schliessen">
          <X />
        </Button>
      </div>

      <form onSubmit={speichern} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Name" htmlFor="plan-name" required error={fehler.name}>
            <Input
              id="plan-name"
              value={werte.name}
              onChange={(e) => setWerte({ ...werte, name: e.target.value })}
              required
              maxLength={80}
            />
          </Field>

          <Field
            label="Schlüssel"
            htmlFor="plan-key"
            required
            error={fehler.key}
            hint={neu ? "Kleinbuchstaben, Zahlen, Unterstrich." : "Wird in Verweisen verwendet."}
          >
            <Input
              id="plan-key"
              value={werte.key}
              onChange={(e) => setWerte({ ...werte, key: e.target.value })}
              required
            />
          </Field>

          <Field label="Stufe" htmlFor="plan-tier" error={fehler.tier}>
            <Select
              id="plan-tier"
              value={werte.tier}
              onChange={(e) => setWerte({ ...werte, tier: e.target.value })}
            >
              {TIERS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Preis" htmlFor="plan-price" required error={fehler.priceChf}>
            <Input
              id="plan-price"
              type="number"
              min={0}
              step="0.05"
              value={werte.priceChf}
              onChange={(e) => setWerte({ ...werte, priceChf: Number(e.target.value) })}
              required
            />
          </Field>

          <Field label="Währung" htmlFor="plan-currency" error={fehler.currency}>
            <Input
              id="plan-currency"
              value={werte.currency}
              onChange={(e) => setWerte({ ...werte, currency: e.target.value.toUpperCase() })}
              maxLength={3}
            />
          </Field>

          <Field label="Abrechnung" htmlFor="plan-interval" error={fehler.billingInterval}>
            <Select
              id="plan-interval"
              value={werte.billingInterval}
              onChange={(e) => setWerte({ ...werte, billingInterval: e.target.value })}
            >
              {Object.entries(BILLING_INTERVAL_LABELS).map(([wert, label]) => (
                <option key={wert} value={wert}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Knopfbeschriftung"
            htmlFor="plan-cta"
            error={fehler.ctaText}
            hint={`Leer = „${defaultCtaText(werte.priceChf)}“`}
          >
            <Input
              id="plan-cta"
              value={werte.ctaText ?? ""}
              onChange={(e) => setWerte({ ...werte, ctaText: e.target.value })}
              maxLength={60}
            />
          </Field>

          <Field
            label="Ziel des Knopfes"
            htmlFor="plan-cta-url"
            error={fehler.ctaUrl}
            hint={`Leer = ${defaultCtaUrl(werte.key || "…")}`}
          >
            <Input
              id="plan-cta-url"
              value={werte.ctaUrl ?? ""}
              onChange={(e) => setWerte({ ...werte, ctaUrl: e.target.value })}
              placeholder="/kontakt"
            />
          </Field>

          <Field label="Testtage" htmlFor="plan-trial" error={fehler.trialDays}>
            <Input
              id="plan-trial"
              type="number"
              min={0}
              max={365}
              value={werte.trialDays}
              onChange={(e) => setWerte({ ...werte, trialDays: Number(e.target.value) })}
            />
          </Field>
        </div>

        <Field label="Kurzbeschreibung" htmlFor="plan-desc" error={fehler.description}>
          <Textarea
            id="plan-desc"
            rows={2}
            value={werte.description ?? ""}
            onChange={(e) => setWerte({ ...werte, description: e.target.value })}
            maxLength={600}
          />
        </Field>

        <div className="flex flex-wrap gap-5">
          {(
            [
              ["isActive", "Aktiv"],
              ["isPublic", "Auf der Preisseite zeigen"],
              ["isRecommended", "Als empfohlen hervorheben"],
            ] as const
          ).map(([feld, label]) => (
            <label key={feld} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={werte[feld]}
                onChange={(e) => setWerte({ ...werte, [feld]: e.target.checked })}
              />
              {label}
            </label>
          ))}
        </div>

        <div>
          <h3 className="mb-1 text-sm font-semibold">Leistungen und Vergleichswerte</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Das Häkchen entscheidet über die Freischaltung und zeigt in der Vergleichstabelle ein
            Häkchen. Ein Freitext ersetzt dort die Anzeige, zum Beispiel „Unlimitiert“ oder „bis 5“.
          </p>

          <div className="space-y-2">
            {features.map((f) => {
              const pf = feature(f.id);
              return (
                <div
                  key={f.id}
                  className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_auto_10rem_8rem] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{f.name}</p>
                    <code className="font-mono text-xs text-muted-foreground">{f.key}</code>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={pf.enabled}
                      onChange={(e) => setzeFeature(f.id, { enabled: e.target.checked })}
                      aria-label={`${f.name} in ${werte.name || "diesem Tarif"} enthalten`}
                    />
                    enthalten
                  </label>
                  <Input
                    value={pf.value ?? ""}
                    onChange={(e) => setzeFeature(f.id, { value: e.target.value || null })}
                    placeholder="Freitext"
                    aria-label={`Vergleichswert für ${f.name}`}
                    className="h-9"
                    maxLength={60}
                  />
                  <Input
                    type="number"
                    min={0}
                    value={pf.limit ?? ""}
                    onChange={(e) =>
                      setzeFeature(f.id, { limit: e.target.value === "" ? null : Number(e.target.value) })
                    }
                    placeholder="Limit"
                    aria-label={`Limit für ${f.name}`}
                    className="h-9"
                  />
                </div>
              );
            })}
            {features.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                Es sind noch keine Leistungen erfasst.
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <Button type="submit" variant="primary" disabled={pending}>
            <Save />
            {neu ? "Tarif anlegen" : "Änderungen speichern"}
          </Button>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Abbrechen
          </Button>
          {!neu ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => setLoeschen(true)}
              disabled={pending}
              className="sm:ml-auto"
            >
              <Trash2 />
              Löschen
            </Button>
          ) : null}
        </div>
      </form>

      <ConfirmDialog
        open={loeschen}
        onClose={() => setLoeschen(false)}
        onConfirm={entfernen}
        pending={pending}
        title={`Tarif „${plan.name}“ löschen?`}
        description={
          plan.subscriptionCount > 0
            ? `Dieser Tarif wird von ${plan.subscriptionCount} Abonnement(en) genutzt. Er wird deshalb nicht gelöscht, sondern deaktiviert – bestehende Abonnements bleiben gültig.`
            : "Der Tarif verschwindet aus der Preisübersicht. Das lässt sich nicht rückgängig machen."
        }
        confirmLabel={plan.subscriptionCount > 0 ? "Deaktivieren" : "Löschen"}
      />
    </Card>
  );
}
