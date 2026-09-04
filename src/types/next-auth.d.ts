import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      isActive: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    isActive: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    isActive: boolean;
  }
}

// next-auth v5 leitet den JWT-Typ aus @auth/core ab.
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    isActive: boolean;
  }
}
