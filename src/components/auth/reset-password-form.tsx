"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/states";
import { apiRequest, errorMessage, fieldErrors } from "@/lib/client-api";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [pending, setPending] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrors({});
    setError(null);

    const data = new FormData(event.currentTarget);

    try {
      await apiRequest("/api/auth/reset-password", {
        method: "POST",
        body: {
          token,
          password: data.get("password"),
          passwordConfirm: data.get("passwordConfirm"),
        },
      });
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  if (!token) {
    return (
      <Alert variant="error" title="Ungültiger Link">
        Dieser Link ist unvollständig.{" "}
        <Link href="/passwort-vergessen" className="underline">
          Fordere einen neuen Link an
        </Link>
        .
      </Alert>
    );
  }

  if (done) {
    return (
      <Alert variant="success" title="Passwort gespeichert">
        Du kannst dich jetzt mit deinem neuen Passwort anmelden. Wir leiten dich weiter …
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error ? <Alert variant="error">{error}</Alert> : null}

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
          required
          minLength={10}
          maxLength={200}
        />
      </Field>

      <Field
        label="Passwort bestätigen"
        htmlFor="passwordConfirm"
        required
        error={errors.passwordConfirm}
      >
        <Input
          id="passwordConfirm"
          name="passwordConfirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          maxLength={200}
        />
      </Field>

      <Button type="submit" size="lg" block disabled={pending}>
        {pending ? <Spinner /> : <KeyRound />}
        {pending ? "Wird gespeichert …" : "Passwort speichern"}
      </Button>
    </form>
  );
}
