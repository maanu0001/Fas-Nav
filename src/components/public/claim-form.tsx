"use client";

import * as React from "react";
import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/states";
import { apiRequest, errorMessage, fieldErrors } from "@/lib/client-api";

/** Formular für den Übernahmeprozess eines noch nicht beanspruchten Profils. */
export function ClaimForm({
  organizationId,
  organizationName,
}: {
  organizationId: string;
  organizationName: string;
}) {
  const [pending, setPending] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrors({});
    setFormError(null);

    const data = new FormData(event.currentTarget);

    try {
      await apiRequest("/api/claim", {
        method: "POST",
        body: {
          organizationId,
          contactName: data.get("contactName"),
          contactEmail: data.get("contactEmail"),
          contactPhone: data.get("contactPhone"),
          message: data.get("message"),
        },
      });
      setDone(true);
    } catch (error) {
      setErrors(fieldErrors(error));
      setFormError(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <Alert variant="success" title="Anfrage eingegangen">
        Danke! Wir prüfen deine Angaben und melden uns per E-Mail mit den nächsten Schritten. Nach
        der Bestätigung kannst du <strong>{organizationName}</strong> selbst verwalten.
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {formError ? <Alert variant="error">{formError}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Dein Name" htmlFor="contactName" required error={errors.contactName}>
          <Input id="contactName" name="contactName" required maxLength={120} autoComplete="name" />
        </Field>
        <Field label="E-Mail" htmlFor="contactEmail" required error={errors.contactEmail}>
          <Input
            id="contactEmail"
            name="contactEmail"
            type="email"
            required
            maxLength={200}
            autoComplete="email"
          />
        </Field>
      </div>

      <Field label="Telefon" htmlFor="contactPhone" error={errors.contactPhone}>
        <Input id="contactPhone" name="contactPhone" type="tel" maxLength={40} autoComplete="tel" />
      </Field>

      <Field
        label="Deine Funktion und Nachricht"
        htmlFor="message"
        required
        error={errors.message}
        hint="Beschreibe kurz deine Rolle in der Organisation, damit wir die Übernahme prüfen können."
      >
        <Textarea
          id="message"
          name="message"
          rows={5}
          required
          maxLength={2000}
          placeholder="Ich bin Präsident der Organisation und möchte das Profil übernehmen …"
        />
      </Field>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? <Spinner /> : <ShieldCheck />}
        {pending ? "Wird gesendet …" : "Übernahme beantragen"}
      </Button>
    </form>
  );
}
