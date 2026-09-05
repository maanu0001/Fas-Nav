"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Pencil, Plus, Save } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableWrapper, Td, Th, Thead, Tr } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { apiRequest, errorMessage } from "@/lib/client-api";
import { BILLING_INTERVAL_LABELS, formatPlanPrice } from "@/lib/pricing";
import {
  FeatureManager,
  type FeatureRow,
} from "@/components/dashboard/pricing/feature-manager";
import { PlanEditor, type PlanRow } from "@/components/dashboard/pricing/plan-editor";
import type { BillingInterval } from "@prisma/client";

/**
 * Übersicht und Bearbeitung der Preisangebote.
 *
 * Die Reihenfolge wird hier nur vorgemerkt und erst auf Knopfdruck gespeichert
 * – so entstehen beim Sortieren nicht bei jedem Klick Schreibzugriffe.
 */
export function PricingManager({
  plans,
  features,
}: {
  plans: PlanRow[];
  features: FeatureRow[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [liste, setListe] = React.useState(plans);
  const [bearbeitung, setBearbeitung] = React.useState<PlanRow | null>(null);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => setListe(plans), [plans]);

  const reihenfolgeGeaendert = liste.some((p, i) => p.id !== plans[i]?.id);

  function verschieben(index: number, richtung: -1 | 1) {
    const ziel = index + richtung;
    if (ziel < 0 || ziel >= liste.length) return;
    const kopie = [...liste];
    [kopie[index], kopie[ziel]] = [kopie[ziel], kopie[index]];
    setListe(kopie);
  }

  async function reihenfolgeSpeichern() {
    setPending(true);
    try {
      await apiRequest("/api/plans", {
        method: "PATCH",
        body: { order: liste.map((p, i) => ({ id: p.id, sortOrder: i })) },
      });
      toast("Reihenfolge gespeichert.", "success");
      router.refresh();
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      setPending(false);
    }
  }

  async function aktivUmschalten(plan: PlanRow) {
    try {
      await apiRequest(`/api/plans/${plan.id}`, {
        method: "PATCH",
        body: { isActive: !plan.isActive },
      });
      toast(plan.isActive ? "Tarif deaktiviert." : "Tarif aktiviert.", "success");
      router.refresh();
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  }

  // Ein neues Angebot gehört ans Ende. Die bestehenden Werte sind in
  // Zehnerschritten vergeben, damit später etwas dazwischen passt.
  const naechsteReihenfolge = liste.reduce((max, p) => Math.max(max, p.sortOrder), 0) + 10;

  const leererTarif: PlanRow = {
    id: null,
    key: "",
    tier: "BASIC",
    name: "",
    description: "",
    priceChf: 0,
    currency: "CHF",
    billingInterval: "YEARLY",
    ctaText: "",
    ctaUrl: "",
    isActive: true,
    isPublic: true,
    isRecommended: false,
    trialDays: 0,
    sortOrder: naechsteReihenfolge,
    features: [],
    subscriptionCount: 0,
  };

  if (bearbeitung) {
    return (
      <PlanEditor
        plan={bearbeitung}
        features={features}
        onClose={() => setBearbeitung(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-base font-semibold">Angebote</h2>
          <div className="flex gap-2">
            {reihenfolgeGeaendert ? (
              <Button variant="outline" onClick={reihenfolgeSpeichern} disabled={pending}>
                <Save />
                Reihenfolge speichern
              </Button>
            ) : null}
            <Button variant="primary" onClick={() => setBearbeitung(leererTarif)}>
              <Plus />
              Neues Angebot
            </Button>
          </div>
        </div>

        {liste.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Es sind noch keine Angebote erfasst. Die öffentliche Preisseite zeigt so lange einen
            Hinweis mit Verweis auf das Kontaktformular.
          </p>
        ) : (
          <TableWrapper>
            <Table>
              <Thead>
                <tr>
                  <Th className="w-20">Reihenfolge</Th>
                  <Th>Angebot</Th>
                  <Th>Preis</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Aktion</Th>
                </tr>
              </Thead>
              <tbody>
                {liste.map((plan, index) => (
                  <Tr key={plan.id}>
                    <Td>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => verschieben(index, -1)}
                          disabled={index === 0}
                          aria-label={`${plan.name} nach vorne`}
                          className="rounded p-1 text-muted-foreground hover:bg-secondary disabled:opacity-30"
                        >
                          <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => verschieben(index, 1)}
                          disabled={index === liste.length - 1}
                          aria-label={`${plan.name} nach hinten`}
                          className="rounded p-1 text-muted-foreground hover:bg-secondary disabled:opacity-30"
                        >
                          <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </div>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{plan.name}</span>
                        {plan.isRecommended ? <Badge variant="accent">Empfohlen</Badge> : null}
                      </div>
                      <code className="font-mono text-xs text-muted-foreground">{plan.key}</code>
                    </Td>
                    <Td>
                      {plan.priceChf === 0
                        ? "Gratis"
                        : formatPlanPrice(plan.priceChf, plan.currency)}
                      <span className="block text-xs text-muted-foreground">
                        {BILLING_INTERVAL_LABELS[plan.billingInterval as BillingInterval]}
                      </span>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant={plan.isActive ? "success" : "muted"}>
                          {plan.isActive ? "Aktiv" : "Inaktiv"}
                        </Badge>
                        {!plan.isPublic ? <Badge variant="muted">Nicht öffentlich</Badge> : null}
                      </div>
                      {plan.subscriptionCount > 0 ? (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {plan.subscriptionCount} Abonnement(e)
                        </span>
                      ) : null}
                    </Td>
                    <Td className="text-right">
                      <div className="inline-flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => aktivUmschalten(plan)}>
                          {plan.isActive ? "Deaktivieren" : "Aktivieren"}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setBearbeitung(plan)}>
                          <Pencil />
                          Bearbeiten
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrapper>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 font-display text-base font-semibold">Leistungen</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Diese Liste bildet zugleich die Zeilen der Vergleichstabelle auf der Preisseite. Die
          Reihenfolge hier bestimmt die Reihenfolge dort.
        </p>
        <FeatureManager features={features} />
      </Card>
    </div>
  );
}
