import type { Metadata } from "next";

import { PageHeader } from "@/components/dashboard/page-header";
import { PricingManager } from "@/components/dashboard/pricing/pricing-manager";
import type { PlanRow } from "@/components/dashboard/pricing/plan-editor";
import { requirePermissionPage } from "@/lib/dashboard-context";
import { allFeatures, allPlansForAdmin } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Preise" };

/**
 * Verwaltung der öffentlichen Preisseite.
 *
 * Der Zugriff hängt am Recht `managePlans`, das ausschliesslich ADMIN besitzt.
 * Die Prüfung steht hier und noch einmal in jedem Endpunkt – die fehlende
 * Navigationsschaltfläche ist für TEAM also kein Schutz, sondern nur Ordnung.
 */
export default async function PricingAdminPage() {
  await requirePermissionPage("managePlans");

  const [plans, features] = await Promise.all([allPlansForAdmin(), allFeatures()]);

  const rows: PlanRow[] = plans.map((plan) => ({
    id: plan.id,
    key: plan.key,
    tier: plan.tier,
    name: plan.name,
    description: plan.description,
    priceChf: Number(plan.priceChf),
    currency: plan.currency,
    billingInterval: plan.billingInterval,
    ctaText: plan.ctaText,
    ctaUrl: plan.ctaUrl,
    isActive: plan.isActive,
    isPublic: plan.isPublic,
    isRecommended: plan.isRecommended,
    trialDays: plan.trialDays,
    sortOrder: plan.sortOrder,
    subscriptionCount: plan._count.subscriptions,
    features: plan.features.map((pf) => ({
      featureId: pf.featureId,
      enabled: pf.enabled,
      limit: pf.limit,
      value: pf.value,
      note: pf.note,
    })),
  }));

  return (
    <>
      <PageHeader
        title="Preise"
        description="Angebote, Leistungen und Vergleichstabelle der öffentlichen Preisseite."
      />
      <PricingManager plans={rows} features={features} />
    </>
  );
}
