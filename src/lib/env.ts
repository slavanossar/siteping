function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function parseCommaSeparated(value: string | undefined): string[] {
  if (!value?.trim()) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function getDatabaseUrl(): string {
  return requireEnv("DATABASE_URL");
}

export function getSitepingApiKey(): string {
  return requireEnv("SITEPING_API_KEY");
}

export function getSitepingAdminPassword(): string {
  return requireEnv("SITEPING_ADMIN_PASSWORD");
}

export function getSessionSecret(): string {
  return requireEnv("SITEPING_SESSION_SECRET");
}

export function getAllowedOrigins(): string[] {
  return parseCommaSeparated(process.env.SITEPING_ALLOWED_ORIGINS);
}

export function getDashboardProjects(): string[] {
  return parseCommaSeparated(process.env.SITEPING_DASHBOARD_PROJECTS);
}

export function getBaseUrl(): string | undefined {
  const value = process.env.SITEPING_BASE_URL?.trim();
  return value || undefined;
}

export function isSecureCookiesEnabled(): boolean {
  const baseUrl = getBaseUrl();
  return baseUrl?.startsWith("https://") ?? process.env.NODE_ENV === "production";
}
