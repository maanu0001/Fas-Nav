import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { CompleteOnboardingButton } from "@/components/dashboard/complete-onboarding";
import { requireOrganizationContext } from "@/lib/dashboard-context";
import { prisma } from "@/lib/prisma";
import { completenessSelect, profileCompleteness } from "@/lib/profile-completeness";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Einrichtung" };

export default async function OnboardingPage() {
  const context = await requireOrganizationContext();

  const org = await prisma.organization.findUnique({
    where: { id: context.organization.id },
    select: { ...completenessSelect, id: true, name: true, slug: true, city: true, status: true },
  });

  if (!org) return null;

  const completeness = profileCompleteness(org);
  const publicHref =
    org.type === "CARNIVAL" ? `/fasnacht/${org.slug}` : `/gugge/${org.slug}`;

  const steps = [
    {
      title: "Grundinformationen",
      description: "Name, Ort, Kanton und Zeitraum deiner Organisation.",
      href: "/dashboard/seite#grundinformationen",
      done: Boolean(org.city),
    },
    {
      title: "Logo hochladen",
      description: "Dein Logo erscheint in Listen und auf deiner Seite.",
      href: "/dashboard/seite#bilder",
      done: Boolean(org.logoId),
    },
    {
      title: "Titelbild hinzufügen",
      description: "Ein breites Bild als Kopfbereich deiner Seite.",
      href: "/dashboard/seite#bilder",
      done: Boolean(org.headerId),
    },
    {
      title: "Beschreibung erfassen",
      description: "Erzähle Besucherinnen und Besuchern, was euch ausmacht.",
      href: "/dashboard/seite#beschreibung",
      done: Boolean(org.shortDescription || org.description),
    },
    {
      title: "Kontaktdaten ergänzen",
      description: "E-Mail, Telefon und Website für Anfragen.",
      href: "/dashboard/seite#kontakt",
      done: Boolean(org.contactEmail),
    },
    {
      title: "Social Media verlinken",
      description: "Führe Besucher zu deinen eigenen Kanälen.",
      href: "/dashboard/seite#social",
      done: org._count.socialLinks > 0,
    },
    {
      title: "Erste Veranstaltung erstellen",
      description: "Damit erscheinst du in der schweizweiten Agenda.",
      href: "/dashboard/veranstaltungen/neu",
      done: org._count.events > 0,
    },
    {
      title: "Vorschau prüfen",
      description: "Schau dir an, wie deine Seite für Besucher aussieht.",
      href: publicHref,
      done: false,
      external: true,
    },
    {
      title: "Seite veröffentlichen",
      description: "Mit einem Klick ist deine Seite online.",
      href: "/dashboard/seite",
      done: org.status === "PUBLISHED",
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;

  return (
    <>
      <PageHeader
        title="Deine Seite einrichten"
        description={`In wenigen Schritten ist ${org.name} bereit für die Öffentlichkeit.`}
      />

      <Card className="mb-6 p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-700">
              Profil zu {completeness.percent} % vollständig
            </p>
            <div
              className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={completeness.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Fortschritt der Einrichtung"
            >
              <div
                className="h-full rounded-full bg-accent-500 transition-all"
                style={{ width: `${completeness.percent}%` }}
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {doneCount} von {steps.length} Schritten erledigt
          </p>
        </div>
      </Card>

      <ol className="space-y-3">
        {steps.map((step, index) => (
          <li key={step.title}>
            <Link
              href={step.href}
              {...(step.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className={cn(
                "group flex items-start gap-4 rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-card",
                step.done ? "border-emerald-200 bg-emerald-50/40" : "border-border",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                  step.done
                    ? "bg-emerald-600 text-white"
                    : "bg-secondary text-primary-800",
                )}
                aria-hidden
              >
                {step.done ? <Check className="h-4 w-4" /> : index + 1}
              </span>

              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-semibold text-primary-900">
                  {step.title}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">{step.description}</p>
              </div>

              <ArrowRight
                className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ol>

      <Card className="mt-6 p-5">
        <h2 className="font-display text-base font-semibold">Einrichtung abschliessen</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Du kannst jederzeit alles anpassen. Wenn du fertig bist, blenden wir diesen
          Einrichtungshinweis aus.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <CompleteOnboardingButton organizationId={org.id} />
          <ButtonLink href="/dashboard/seite" variant="outline">
            Zur Seitenbearbeitung
          </ButtonLink>
        </div>
      </Card>
    </>
  );
}
