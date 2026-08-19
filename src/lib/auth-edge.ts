const SESSION_MAX_AGE_MS = 60 * 60 * 24 * 7 * 1000;

export const SESSION_COOKIE_NAME = "siteping_session";

type SessionPayload = {
  nonce: string;
  expiresAt: number;
};

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (padded.length % 4)) % 4;
  const base64 = padded + "=".repeat(padding);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function timingSafeEqualStrings(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}

async function signPayload(
  encodedPayload: string,
  secret: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(encodedPayload),
  );

  return base64UrlEncode(new Uint8Array(signature));
}

function parseSessionPayload(encodedPayload: string): SessionPayload | null {
  try {
    const json = new TextDecoder().decode(base64UrlDecode(encodedPayload));
    const payload = JSON.parse(json) as SessionPayload;

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

export async function verifySessionTokenEdge(
  token: string | undefined,
  secret: string | undefined,
): Promise<boolean> {
  if (!token || !secret) {
    return false;
  }

  const separatorIndex = token.lastIndexOf(".");
  if (separatorIndex === -1) {
    return false;
  }

  const encodedPayload = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);
  const expectedSignature = await signPayload(encodedPayload, secret);

  if (!timingSafeEqualStrings(signature, expectedSignature)) {
    return false;
  }

  return parseSessionPayload(encodedPayload) !== null;
}

export function getSessionTokenFromCookieHeader(
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

export { SESSION_MAX_AGE_MS, type SessionPayload };
