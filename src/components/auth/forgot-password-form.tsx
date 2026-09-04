"use client";

import * as React from "react";
import { Send } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/states";
import { apiRequest, errorMessage, fieldErrors } from "@/lib/client-api";

export function ForgotPasswordForm() {
  const [pending, setPending] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrors({});
    setError(null);

    const data = new FormData(event.currentTarget);

    try {
      await apiRequest("/api/auth/forgot-password", {
        method: "POST",
        body: { email: data.get("email") },
      });
      setSent(true);
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <Alert variant="success" title="E-Mail unterwegs">
        Falls ein Konto mit dieser Adresse existiert, haben wir dir einen Link zum Zurücksetzen
        gesendet. Er ist 60 Minuten gültig. Prüfe auch deinen Spam-Ordner.
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error ? <Alert variant="error">{error}</Alert> : null}

      <Field label="E-Mail" htmlFor="email" required error={errors.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required maxLength={200} />
      </Field>

      <Button type="submit" size="lg" block disabled={pending}>
        {pending ? <Spinner /> : <Send />}
        {pending ? "Wird gesendet …" : "Link anfordern"}
      </Button>
    </form>
  );
}
