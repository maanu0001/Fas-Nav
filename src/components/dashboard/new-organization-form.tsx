"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/states";
import { apiRequest, errorMessage, fieldErrors } from "@/lib/client-api";
import { slugify } from "@/lib/utils";
import type { OrganizationType } from "@prisma/client";

/**
 * Anlage einer Organisation durch Admin oder Team.
 * Der Slug wird automatisch vorgeschlagen, bleibt aber anpassbar.
 */
export function NewOrganizationForm({
  cantons,
  defaultType,
}: {
  cantons: { id: string; name: string }[];
  defaultType: OrganizationType;
}) {
  const router = useRouter();

  const [type, setType] = React.useState<OrganizationType>(defaultType);
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [slugTouched, setSlugTouched] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  // Solange der Slug nicht manuell bearbeitet wurde, folgt er dem Namen.
  React.useEffect(() => {
    if (!slugTouched) setSlug(slugify(name));
  }, [name, slugTouched]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrors({});
    setFormError(null);

    const data = new FormData(event.currentTarget);

    try {
      const created = await apiRequest<{ id: string }>("/api/organizations", {
        method: "POST",
        body: {
          type,
          name,
          slug: slug || undefined,
          city: data.get("city"),
          cantonId: data.get("cantonId"),
          shortDescription: data.get("shortDescription") || null,
          contactEmail: data.get("contactEmail") || null,
          website: data.get("website") || null,
          status: data.get("status"),
          claimStatus: data.get("claimStatus"),
        },
      });
      router.push(`/dashboard/organisationen/${created.id}`);
    } catch (error) {
      setErrors(fieldErrors(error));
      setFormError(errorMessage(error));
      setPending(false);
    }
  }

  return (
    <Card className="max-w-2xl p-6">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {formError ? <Alert variant="error">{formError}</Alert> : null}

        <Field label="Art" htmlFor="type" required>
          <Select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value as OrganizationType)}
          >
            <option value="CARNIVAL">Fasnacht</option>
            <option value="GUGGE">Guggenmusik</option>
          </Select>
        </Field>

        <Field label="Name" htmlFor="name" required error={errors.name}>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={140}
            required
            placeholder={type === "CARNIVAL" ? "z.B. Oltner Fasnacht" : "z.B. Guggenmusik Chesslete"}
          />
        </Field>

        <Field
          label="Slug (öffentliche Adresse)"
          htmlFor="slug"
          error={errors.slug}
          hint={`Ergibt fas-nav.ch/${type === "CARNIVAL" ? "fasnacht" : "gugge"}/${slug || "…"}`}
        >
          <Input
            id="slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            maxLength={90}
            pattern="[a-z0-9\-]+"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ort" htmlFor="city" required error={errors.city}>
            <Input id="city" name="city" maxLength={120} required />
          </Field>
          <Field label="Kanton" htmlFor="cantonId" required error={errors.cantonId}>
            <Select id="cantonId" name="cantonId" required>
              {cantons.map((canton) => (
                <option key={canton.id} value={canton.id}>
                  {canton.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field
          label="Kurzbeschreibung"
          htmlFor="shortDescription"
          error={errors.shortDescription}
        >
          <Textarea id="shortDescription" name="shortDescription" rows={3} maxLength={400} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kontakt-E-Mail" htmlFor="contactEmail" error={errors.contactEmail}>
            <Input id="contactEmail" name="contactEmail" type="email" maxLength={200} />
          </Field>
          <Field label="Website" htmlFor="website" error={errors.website}>
            <Input
              id="website"
              name="website"
              type="url"
              maxLength={500}
              placeholder="https://…"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Veröffentlichung" htmlFor="status">
            <Select id="status" name="status" defaultValue="DRAFT">
              <option value="DRAFT">Entwurf</option>
              <option value="PUBLISHED">Sofort veröffentlichen</option>
            </Select>
          </Field>
          <Field
            label="Übernahmestatus"
            htmlFor="claimStatus"
            hint="Von Fas-Nav vorangelegte Profile bleiben „nicht beansprucht“."
          >
            <Select id="claimStatus" name="claimStatus" defaultValue="UNCLAIMED">
              <option value="UNCLAIMED">Nicht beansprucht</option>
              <option value="CLAIMED">Beansprucht</option>
            </Select>
          </Field>
        </div>

        <Button type="submit" size="lg" disabled={pending || !name}>
          {pending ? <Spinner /> : <Plus />}
          Organisation erstellen
        </Button>
      </form>
    </Card>
  );
}
