"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authFetch } from "@/lib/api";
import { BulkImportGuideCard } from "@/components/dashboard/BulkImportGuide";
import { dash } from "@/lib/dashboardUi";

type ModulesMap = Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean }>;

export default function OnboardingPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    authFetch("/api/auth/permissions")
      .then(async (r) => {
        const d = (await r.json().catch(() => null)) as { modules?: ModulesMap } | null;
        const ok = Boolean(d?.modules?.onboarding?.view);
        setAllowed(ok);
      })
      .catch(() => setAllowed(false));
  }, []);

  if (allowed == null) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Loading onboarding…</p>;
  }

  if (!allowed) {
    return (
      <div className={`${dash.card} p-6`}>
        <h1 className={dash.pageTitle}>Onboarding</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Only administrators can access onboarding setup instructions.
        </p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className={dash.pageTitle}>Onboarding</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Setup order for Excel imports and file upload dependencies.
        </p>
      </div>
      <BulkImportGuideCard />
    </div>
  );
}
