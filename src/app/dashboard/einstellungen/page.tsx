import type { Metadata } from "next";

import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { PasswordChangeForm } from "@/components/dashboard/password-change-form";
import { PlatformSettingsForm } from "@/components/dashboard/platform-settings-form";
import { ROLE_LABELS } from "@/lib/constants";
import { getDashboardContext } from "@/lib/dashboard-context";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";
import type { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Einstellungen" };

export default async function SettingsPage() {
  const context = await getDashboardContext();
  const admin = isAdmin(context.user.role as Role);

  const settings = admin
    ? await prisma.siteSetting.findMany({ orderBy: [{ group: "asc" }, { key: "asc" }] })
    : [];

  return (
    <>
      <PageHeader title="Einstellungen" description="Dein Konto und die Plattform." />

      <div className="space-y-6">
        <Card className="p-5">
          <h2 className="mb-4 font-display text-base font-semibold">Dein Konto</h2>
          <dl className="grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Name</dt>
              <dd className="mt-0.5 text-sm font-medium">{context.user.name}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">E-Mail</dt>
              <dd className="mt-0.5 break-all text-sm font-medium">{context.user.email}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Rolle</dt>
              <dd className="mt-0.5 text-sm font-medium">
                {ROLE_LABELS[context.user.role as Role]}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-display text-base font-semibold">Passwort ändern</h2>
          <PasswordChangeForm />
        </Card>

        {admin ? (
          <Card className="p-5">
            <h2 className="mb-1 font-display text-base font-semibold">Plattform-Einstellungen</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Diese Angaben erscheinen unter anderem im Impressum, auf der Kontaktseite und der
              Preisseite.
            </p>
            <PlatformSettingsForm
              settings={settings.map((s) => ({
                key: s.key,
                label: s.label ?? s.key,
                group: s.group,
                value: typeof s.value === "string" ? s.value : JSON.stringify(s.value),
              }))}
            />
          </Card>
        ) : null}
      </div>
    </>
  );
}
