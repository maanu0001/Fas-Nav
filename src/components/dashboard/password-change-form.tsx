"use client";

import * as React from "react";
import { KeyRound } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { apiRequest, errorMessage, fieldErrors } from "@/lib/client-api";

export function PasswordChangeForm() {
  const { toast } = useToast();
  const formRef = React.useRef<HTMLFormElement>(null);
  const [pending, setPending] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrors({});
    setError(null);

    const data = new FormData(event.currentTarget);

    try {
      await apiRequest("/api/account/password", {
        method: "POST",
        body: {
          currentPassword: data.get("currentPassword"),
          password: data.get("password"),
          passwordConfirm: data.get("passwordConfirm"),
        },
      });
      toast("Passwort geändert.", "success");
      formRef.current?.reset();
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="max-w-md space-y-4" noValidate>
      {error ? <Alert variant="error">{error}</Alert> : null}

      <Field
        label="Aktuelles Passwort"
        htmlFor="currentPassword"
        required
        error={errors.currentPassword}
      >
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <Field
        label="Neues Passwort"
        htmlFor="password"
        required
        error={errors.password}
        hint="Mindestens 10 Zeichen, mit Gross- und Kleinbuchstaben sowie einer Ziffer."
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
        />
      </Field>

      <Field
        label="Neues Passwort bestätigen"
        htmlFor="passwordConfirm"
        required
        error={errors.passwordConfirm}
      >
        <Input
          id="passwordConfirm"
          name="passwordConfirm"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
        />
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? <Spinner /> : <KeyRound />}
        Passwort ändern
      </Button>
    </form>
  );
}
