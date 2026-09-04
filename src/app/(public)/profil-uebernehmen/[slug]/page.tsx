import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { ClaimForm } from "@/components/public/claim-form";
import { organizationHref } from "@/components/public/organization-card";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return buildMetadata({
    title: "Profil übernehmen",
    description: "Übernimm das Profil deiner Organisation auf Fas-Nav.ch.",
    path: `/profil-uebernehmen/${slug}`,
    noIndex: true,
  });
}

export default async function ClaimPage({ params }: Props) {
  const { slug } = await params;

  const org = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, type: true, city: true, claimStatus: true },
  });

  if (!org) notFound();

  return (
    <div className="container py-12 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-3xl font-bold">Profil übernehmen</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          Du möchtest das Profil von{" "}
          <Link href={organizationHref(org)} className="font-medium text-primary-700 hover:underline">
            {org.name}
          </Link>{" "}
          ({org.city}) für deine Organisation übernehmen? Sende uns eine kurze Anfrage.
        </p>

        <Card className="mt-8 p-6 sm:p-8">
          {org.claimStatus === "CLAIMED" ? (
            <Alert variant="info" title="Dieses Profil wird bereits verwaltet">
              Die Organisation betreut ihre Seite bereits selbst. Falls du dennoch Zugriff
              benötigst, melde dich über unser{" "}
              <Link href="/kontakt" className="underline">
                Kontaktformular
              </Link>
              .
            </Alert>
          ) : org.claimStatus === "CLAIM_REQUESTED" ? (
            <Alert variant="warning" title="Übernahme bereits angefragt">
              Für dieses Profil liegt bereits eine Anfrage vor. Wir prüfen sie und melden uns bei
              der angegebenen Kontaktperson.
            </Alert>
          ) : (
            <ClaimForm organizationId={org.id} organizationName={org.name} />
          )}
        </Card>
      </div>
    </div>
  );
}
