import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard-shell";
import { isAuthenticatedRequest } from "@/lib/auth";
import { getDashboardProjects } from "@/lib/env";
import { headers } from "next/headers";

export default async function HomePage() {
  const requestHeaders = await headers();
  const cookieHeader = requestHeaders.get("cookie") ?? "";
  const authenticated = isAuthenticatedRequest(
    new Request("http://localhost", { headers: { cookie: cookieHeader } }),
  );

  if (!authenticated) {
    redirect("/login");
  }

  const projects = getDashboardProjects();

  return (
    <main className="flex min-h-full flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <DashboardShell projects={projects} />
    </main>
  );
}
