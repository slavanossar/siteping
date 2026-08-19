"use client";

import { SitepingInbox } from "@siteping/dashboard";
import { useRouter } from "next/navigation";

type DashboardShellProps = {
  projects: readonly string[];
};

export function DashboardShell({ projects }: DashboardShellProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          No dashboard projects configured
        </h1>
        <p className="max-w-lg text-sm text-zinc-600 dark:text-zinc-400">
          Set <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-zinc-900">SITEPING_DASHBOARD_PROJECTS</code>{" "}
          to a comma-separated list of project names (for example{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-zinc-900">staging-app,staging-marketing</code>
          ), then restart the container.
        </p>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div>
          <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            SitePing
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Feedback triage dashboard
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          Sign out
        </button>
      </header>
      <div className="min-h-0 flex-1">
        <SitepingInbox
          projects={projects}
          endpoint="/api/internal/siteping"
          theme="auto"
        />
      </div>
    </div>
  );
}
