import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("[health] Database check failed:", error);

    return NextResponse.json(
      { status: "error", message: "Database unreachable" },
      { status: 503 },
    );
  }
}
