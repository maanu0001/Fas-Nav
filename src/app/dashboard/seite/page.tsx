import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OrganizationEditor } from "@/components/dashboard/editor/organization-editor";
import { PageHeader } from "@/components/dashboard/page-header";
import { requireOrganizationContext } from "@/lib/dashboard-context";
import { editorSelect, publicHrefFor, toEditorState } from "@/lib/editor-state";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Meine Seite" };

export default async function MyPageEditor() {
  const context = await requireOrganizationContext();

  const [organization, cantons] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: context.organization.id },
      select: editorSelect,
    }),
    prisma.canton.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!organization) notFound();

  // Nur Leserechte bedeuten: kein Bearbeiten und kein Veröffentlichen.
  const readOnly = context.organization.membershipRole === "VIEWER";

  return (
    <>
      <PageHeader
        title="Meine Seite"
        description="Bearbeite die Inhalte deiner öffentlichen Profilseite. Änderungen siehst du sofort in der Vorschau."
      />

      {readOnly ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Dein Konto hat nur Leserechte für diese Organisation.
        </p>
      ) : null}

      <OrganizationEditor
        organizationId={organization.id}
        type={organization.type}
        status={organization.status}
        publicHref={publicHrefFor(organization)}
        cantons={cantons}
        initial={toEditorState(organization)}
        canPublish={!readOnly}
      />
    </>
  );
}
