import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Healthcheck für Container-Orchestrierung und Loadbalancer. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: "ok", database: "up", timestamp: new Date().toISOString() },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { status: "error", database: "down", timestamp: new Date().toISOString() },
      { status: 503 },
    );
  }
}
