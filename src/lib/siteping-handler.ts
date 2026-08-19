import {
  createSitepingHandler,
  type SitepingHandler,
} from "@siteping/adapter-prisma";

import { getAllowedOrigins, getSitepingApiKey } from "@/lib/env";
import { prisma } from "@/lib/prisma";

let cachedHandlers: SitepingHandler | null = null;

export function getSitepingHandlers(): SitepingHandler {
  if (cachedHandlers) {
    return cachedHandlers;
  }

  const allowedOrigins = getAllowedOrigins();

  cachedHandlers = createSitepingHandler({
    prisma,
    apiKey: getSitepingApiKey(),
    publicEndpoints: ["GET", "POST", "OPTIONS"],
    allowedOrigins: allowedOrigins.length > 0 ? allowedOrigins : undefined,
    // screenshotStorage can be wired here later (e.g. Cloudflare R2).
    // webhooks can be wired here later (e.g. GitHub issue creation).
  });

  return cachedHandlers;
}

export function withSitepingApiKey(request: Request): Request {
  const headers = new Headers(request.headers);
  headers.set("Authorization", `Bearer ${getSitepingApiKey()}`);

  return new Request(request.url, {
    method: request.method,
    headers,
    body: request.body,
    // @ts-expect-error RequestInit duplex is required when forwarding a body.
    duplex: "half",
  });
}
