import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/page-header";
import { HomepageSectionEditor } from "@/components/dashboard/homepage-editor";
import { getHomepageSections } from "@/lib/queries/homepage";
import { requirePermissionPage } from "@/lib/dashboard-context";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Homepage" };

export default async function HomepageCmsPage() {
  await requirePermissionPage("manageHomepage");
  const sections = await getHomepageSections(true);

  return (
    <>
      <PageHeader
        title="Homepage"
        description="Bearbeite die Sektionen der öffentlichen Startseite. Änderungen sind sofort sichtbar."
        actions={
          <ButtonLink href="/" target="_blank" rel="noopener noreferrer" variant="outline">
            Startseite ansehen
            <ExternalLink />
          </ButtonLink>
        }
      />

      <div className="space-y-4">
        {sections.map((section) => (
          <HomepageSectionEditor
            key={section.id}
            section={{
              id: section.id,
              key: section.key,
              type: section.type,
              eyebrow: section.eyebrow,
              title: section.title,
              subtitle: section.subtitle,
              isVisible: section.isVisible,
              sortOrder: section.sortOrder,
              data: section.data,
            }}
          />
        ))}
      </div>
    </>
  );
}
