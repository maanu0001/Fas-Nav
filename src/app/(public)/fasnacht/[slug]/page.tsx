import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OrganizationProfile } from "@/components/public/organization-profile";
import { ViewTracker } from "@/components/public/view-tracker";
import {
  getPublicOrganization,
  organizationEvents,
  relatedOrganizations,
} from "@/lib/queries/organization";
import { breadcrumbJsonLd, buildMetadata, jsonLdScript, organizationJsonLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };


export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const org = await getPublicOrganization(slug, "CARNIVAL");
  if (!org) return buildMetadata({ title: "Fasnacht nicht gefunden", path: `/fasnacht/${slug}`, noIndex: true });

  return buildMetadata({
    title: org.metaTitle || `${org.name} – Fasnacht in ${org.city}`,
    description:
      org.metaDesc ||
      org.shortDescription ||
      `${org.name} in ${org.city} (${org.canton.name}): Termine, Programm, Umzüge und alle Informationen zur Fasnacht.`,
    path: `/fasnacht/${org.slug}`,
    image: org.ogImage?.url ?? org.header?.url ?? org.logo?.url,
    type: "profile",
    keywords: [
      org.name,
      `Fasnacht ${org.city}`,
      `Fasnacht ${org.canton.name}`,
      "Fasnacht Termine",
      "Umzug",
    ],
  });
}

export default async function FasnachtPage({ params }: Props) {
  const { slug } = await params;
  const org = await getPublicOrganization(slug, "CARNIVAL");
  if (!org) notFound();

  const [events, related] = await Promise.all([
    organizationEvents(org.id),
    relatedOrganizations(org.id, org.canton.slug, "CARNIVAL"),
  ]);

  const jsonLd = [
    organizationJsonLd({
      name: org.name,
      slug: org.slug,
      type: "CARNIVAL",
      description: org.shortDescription ?? org.description,
      logo: org.logo?.url,
      image: org.header?.url,
      city: org.city,
      zip: org.zip,
      street: org.street,
      cantonName: org.canton.name,
      website: org.website,
      email: org.contactEmail,
      phone: org.contactPhone,
      sameAs: org.socialLinks.map((l) => l.url),
    }),
    breadcrumbJsonLd([
      { name: "Startseite", path: "/" },
      { name: "Fasnachten", path: "/fasnachten" },
      { name: org.name, path: `/fasnacht/${org.slug}` },
    ]),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(jsonLd)} />
      <ViewTracker target="ORGANIZATION" organizationId={org.id} path={`/fasnacht/${org.slug}`} />
      <OrganizationProfile organization={org} events={events} related={related} />
    </>
  );
}
