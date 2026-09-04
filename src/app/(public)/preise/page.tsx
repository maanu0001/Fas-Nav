import type { Metadata } from "next";
import { Check, Minus } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";
import { formatChf, cn } from "@/lib/utils";
import { getSiteSettings, settingString } from "@/lib/queries/homepage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Preise für Fasnachten und Guggen",
  description:
    "Transparente Jahresabos für Fasnachtsorganisationen und Guggenmusiken auf Fas-Nav.ch. Eigene Profilseite, Veranstaltungen in der schweizweiten Agenda und mehr Reichweite.",
  path: "/preise",
  keywords: ["Fasnacht Verein Website", "Guggenmusik Profil", "Fas-Nav Preise"],
});

const INTERVAL_LABEL: Record<string, string> = {
  YEARLY: "/ Jahr",
  MONTHLY: "/ Monat",
  ONE_TIME: "einmalig",
};

export default async function PricingPage() {
  const [plans, settings] = await Promise.all([
    prisma.plan.findMany({
      where: { isActive: true, isPublic: true },
      include: {
        features: {
          include: { feature: true },
          orderBy: { feature: { sortOrder: "asc" } },
        },
      },
      orderBy: { sortOrder: "asc" },
    }),
    getSiteSettings(),
  ]);

  // Vergleichsmatrix über alle in den Tarifen vorkommenden Funktionen.
  const allFeatures = Array.from(
    new Map(
      plans
        .flatMap((plan) => plan.features.map((pf) => pf.feature))
        .map((feature) => [feature.id, feature]),
    ).values(),
  ).sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <>
      <div className="border-b border-border bg-hero text-white">
        <div className="container py-14 text-center sm:py-20">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-brand-accent">
            Für Organisationen
          </p>
          <h1 className="mx-auto max-w-3xl font-display text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            {settingString(settings, "pricing_title", "Deine Fasnacht. Deine Gugge. Deine Seite.")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-white/75">
            {settingString(
              settings,
              "pricing_subtitle",
              "Präsentiere deine Organisation auf Fas-Nav.ch und erreiche Fasnachtsbegeisterte in der ganzen Schweiz. Faire Jahrespreise, jederzeit selbst bearbeitbar.",
            )}
          </p>
        </div>
      </div>

      <div className="container py-14">
        {plans.length === 0 ? (
          <EmptyState
            title="Aktuell sind keine Tarife veröffentlicht"
            description="Bitte melde dich bei uns – wir informieren dich gerne über die aktuellen Konditionen."
            action={<ButtonLink href="/kontakt">Kontakt aufnehmen</ButtonLink>}
          />
        ) : (
          <>
            <div
              className={cn(
                "mx-auto grid max-w-5xl gap-6",
                plans.length === 1 ? "max-w-md" : plans.length === 2 ? "sm:grid-cols-2" : "lg:grid-cols-3",
              )}
            >
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={cn(
                    "relative flex flex-col rounded-2xl border bg-card p-6 shadow-subtle",
                    plan.isRecommended
                      ? "border-accent-300 shadow-card ring-1 ring-accent-200"
                      : "border-border",
                  )}
                >
                  {plan.isRecommended ? (
                    <Badge variant="accent" className="absolute -top-3 left-6">
                      Empfohlen
                    </Badge>
                  ) : null}

                  <h2 className="font-display text-lg font-bold">{plan.name}</h2>
                  {plan.description ? (
                    <p className="mt-1.5 text-sm text-muted-foreground">{plan.description}</p>
                  ) : null}

                  <p className="mt-5 flex items-baseline gap-1.5">
                    <span className="font-display text-4xl font-extrabold text-primary-900">
                      {Number(plan.priceChf) === 0 ? "Gratis" : formatChf(Number(plan.priceChf))}
                    </span>
                    {Number(plan.priceChf) > 0 ? (
                      <span className="text-sm text-muted-foreground">
                        {INTERVAL_LABEL[plan.billingInterval] ?? ""}
                      </span>
                    ) : null}
                  </p>

                  {plan.trialDays > 0 ? (
                    <p className="mt-1.5 text-xs font-medium text-emerald-700">
                      {plan.trialDays} Tage kostenlos testen
                    </p>
                  ) : null}

                  <ul className="mt-6 flex-1 space-y-2.5">
                    {plan.features
                      .filter((pf) => pf.enabled)
                      .map((pf) => (
                        <li key={pf.id} className="flex gap-2.5 text-sm">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                          <span className="text-slate-700">
                            {pf.feature.name}
                            {pf.limit !== null ? (
                              <span className="text-muted-foreground"> (bis {pf.limit})</span>
                            ) : null}
                            {pf.note ? (
                              <span className="text-muted-foreground"> – {pf.note}</span>
                            ) : null}
                          </span>
                        </li>
                      ))}
                  </ul>

                  <ButtonLink
                    href={`/organisation-eintragen?plan=${plan.key}`}
                    variant={plan.isRecommended ? "accent" : "primary"}
                    block
                    size="lg"
                    className="mt-7"
                  >
                    {Number(plan.priceChf) === 0 ? "Kostenlos starten" : "Jetzt eintragen"}
                  </ButtonLink>
                </div>
              ))}
            </div>

            {allFeatures.length ? (
              <section className="mt-16">
                <h2 className="mb-6 text-center font-display text-2xl font-bold">
                  Leistungen im Vergleich
                </h2>
                <div className="mx-auto max-w-4xl overflow-x-auto rounded-xl border border-border bg-card">
                  <table className="w-full min-w-[560px] text-sm">
                    <caption className="sr-only">Vergleich der verfügbaren Tarife</caption>
                    <thead className="bg-muted/60">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left font-semibold">
                          Funktion
                        </th>
                        {plans.map((plan) => (
                          <th key={plan.id} scope="col" className="px-4 py-3 text-center font-semibold">
                            {plan.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {allFeatures.map((feature) => (
                        <tr key={feature.id} className="border-t border-border">
                          <th scope="row" className="px-4 py-3 text-left font-medium text-slate-700">
                            {feature.name}
                            {feature.description ? (
                              <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                                {feature.description}
                              </span>
                            ) : null}
                          </th>
                          {plans.map((plan) => {
                            const pf = plan.features.find((f) => f.featureId === feature.id);
                            return (
                              <td key={plan.id} className="px-4 py-3 text-center">
                                {pf?.enabled ? (
                                  pf.limit !== null ? (
                                    <span className="font-medium text-primary-800">
                                      bis {pf.limit}
                                    </span>
                                  ) : (
                                    <Check
                                      className="mx-auto h-4 w-4 text-emerald-600"
                                      aria-label="enthalten"
                                    />
                                  )
                                ) : (
                                  <Minus
                                    className="mx-auto h-4 w-4 text-muted-foreground/50"
                                    aria-label="nicht enthalten"
                                  />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}
          </>
        )}

        <div className="mx-auto mt-16 max-w-2xl rounded-2xl border border-border bg-secondary p-8 text-center">
          <h2 className="font-display text-xl font-bold">Noch Fragen?</h2>
          <p className="mt-2 text-sm text-slate-600">
            Wir beraten dich gerne, welcher Tarif zu deiner Organisation passt – auch bei
            Sonderwünschen und individuellen Lösungen.
          </p>
          <ButtonLink href="/kontakt" variant="outline" className="mt-5">
            Kontakt aufnehmen
          </ButtonLink>
        </div>
      </div>
    </>
  );
}
