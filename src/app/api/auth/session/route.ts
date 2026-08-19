import { NextResponse } from "next/server";

import { isAuthenticatedRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return NextResponse.json({
    authenticated: isAuthenticatedRequest(request),
  });
}
