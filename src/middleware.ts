import NextAuth from "next-auth";

import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

/**
 * Grober Zugriffsschutz auf Routenebene.
 * Die verbindliche Rechteprüfung erfolgt zusätzlich in jedem Server-Zugriff
 * (siehe src/lib/rbac.ts); die Middleware verhindert lediglich, dass
 * nicht angemeldete Personen das Dashboard überhaupt laden.
 */
export default auth((request) => {
  const { nextUrl } = request;
  const isLoggedIn = Boolean(request.auth?.user);
  const isDashboard = nextUrl.pathname.startsWith("/dashboard");
  const isAuthPage =
    nextUrl.pathname === "/login" || nextUrl.pathname === "/passwort-vergessen";

  if (isDashboard && !isLoggedIn) {
    const callbackUrl = encodeURIComponent(`${nextUrl.pathname}${nextUrl.search}`);
    return Response.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, nextUrl));
  }

  if (isAuthPage && isLoggedIn) {
    return Response.redirect(new URL("/dashboard", nextUrl));
  }
});

export const config = {
  // Statische Assets und Bildoptimierung bleiben unberührt.
  matcher: ["/((?!api|_next/static|_next/image|uploads|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
