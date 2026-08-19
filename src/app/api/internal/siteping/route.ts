import { NextResponse } from "next/server";

import { isAuthenticatedRequest } from "@/lib/auth";
import {
  getSitepingHandlers,
  withSitepingApiKey,
} from "@/lib/siteping-handler";

export const dynamic = "force-dynamic";

async function requireSession(request: Request): Promise<Response | null> {
  if (!isAuthenticatedRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

export async function GET(request: Request) {
  const unauthorized = await requireSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  return getSitepingHandlers().GET(withSitepingApiKey(request));
}

export async function PATCH(request: Request) {
  const unauthorized = await requireSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  return getSitepingHandlers().PATCH(withSitepingApiKey(request));
}

export async function DELETE(request: Request) {
  const unauthorized = await requireSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  return getSitepingHandlers().DELETE(withSitepingApiKey(request));
}
