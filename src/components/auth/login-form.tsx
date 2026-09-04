"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, LogIn } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/states";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);

  // Nur interne Ziele zulassen – verhindert Open-Redirects.
  const rawCallback = searchParams.get("callbackUrl") ?? "/dashboard";
  const callbackUrl = rawCallback.startsWith("/") && !rawCallback.startsWith("//")
    ? rawCallback
    : "/dashboard";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const data = new FormData(event.currentTarget);

    const result = await signIn("credentials", {
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
      redirect: false,
    });

    if (result?.error) {
      // Bewusst unspezifisch, um keine Rückschlüsse auf existierende Konten zu erlauben.
      setError("E-Mail-Adresse oder Passwort ist nicht korrekt.");
      setPending(false);
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error ? <Alert variant="error">{error}</Alert> : null}

      <Field label="E-Mail" htmlFor="email" required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={200}
          placeholder="name@organisation.ch"
        />
      </Field>

      <Field label="Passwort" htmlFor="password" required>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            maxLength={200}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground transition-colors hover:text-foreground"
            aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>

      <div className="flex justify-end">
        <Link
          href="/passwort-vergessen"
          className="text-sm text-primary-700 transition-colors hover:underline"
        >
          Passwort vergessen?
        </Link>
      </div>

      <Button type="submit" size="lg" block disabled={pending}>
        {pending ? <Spinner /> : <LogIn />}
        {pending ? "Wird angemeldet …" : "Anmelden"}
      </Button>
    </form>
  );
}
