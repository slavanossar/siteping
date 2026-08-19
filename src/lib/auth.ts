import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import {
  getSessionSecret,
  getSitepingAdminPassword,
  isSecureCookiesEnabled,
} from "@/lib/env";

import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_MS,
  type SessionPayload,
} from "@/lib/auth-edge";

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function encodeSession(payload: SessionPayload, secret: string): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );
  const signature = signPayload(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

function decodeSession(token: string, secret: string): SessionPayload | null {
  const separatorIndex = token.lastIndexOf(".");
  if (separatorIndex === -1) {
    return null;
  }

  const encodedPayload = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);
  const expectedSignature = signPayload(encodedPayload, secret);

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as SessionPayload;

    if (
      typeof payload.nonce !== "string" ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt <= Date.now()
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function createSessionToken(): string {
  const payload: SessionPayload = {
    nonce: randomBytes(32).toString("base64url"),
    expiresAt: Date.now() + SESSION_MAX_AGE_MS,
  };

  return encodeSession(payload, getSessionSecret());
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) {
    return false;
  }

  return decodeSession(token, getSessionSecret()) !== null;
}

export function verifyAdminPassword(password: string): boolean {
  const expected = getSitepingAdminPassword();
  const provided = Buffer.from(password);
  const expectedBuffer = Buffer.from(expected);

  if (provided.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(provided, expectedBuffer);
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: isSecureCookiesEnabled(),
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_MS / 1000,
  };
}

export function getSessionTokenFromRequest(request: Request): string | undefined {
  return getSessionTokenFromCookieHeader(request.headers.get("cookie"));
}

export function isAuthenticatedRequest(request: Request): boolean {
  return verifySessionToken(getSessionTokenFromRequest(request));
}

export { SESSION_COOKIE_NAME };

function getSessionTokenFromCookieHeader(
  cookieHeader: string | null,
): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }

  for (const part of cookieHeader.split(";")) {
    const [name, ...valueParts] = part.trim().split("=");
    if (name === SESSION_COOKIE_NAME) {
      return decodeURIComponent(valueParts.join("="));
    }
  }

  return undefined;
}
