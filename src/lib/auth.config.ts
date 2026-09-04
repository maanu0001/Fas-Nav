import type { NextAuthConfig } from "next-auth";

/**
 * Edge-kompatible Basiskonfiguration ohne Prisma/bcrypt.
 * Wird von der Middleware verwendet; die vollständige Konfiguration
 * inklusive Credentials-Provider liegt in `src/lib/auth.ts`.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7, // 7 Tage
    updateAge: 60 * 60 * 24,
  },
  trustHost: true,
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.isActive = user.isActive;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.isActive = token.isActive;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
