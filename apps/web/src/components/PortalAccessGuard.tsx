"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authFetch } from "@/lib/api";

const ALLOWED_PREFIXES = ["/dashboard/fees", "/dashboard/settings"];

function pathAllowed(pathname: string): boolean {
  return ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Fee-based portal limit only. Manual suspension (Admin/CMD/Principal) is handled in
 * `DashboardGate` with a full-screen message — those users never reach the dashboard shell.
 */
type PortalState = {
  portalAccessRestricted: boolean;
  portalRestrictionReason: string | null;
  portalRestrictionSource: "manual" | "fee" | null;
};

export default function PortalAccessGuard({
  children,
  portalState,
  portalChecked,
}: {
  children: React.ReactNode;
  portalState?: PortalState | null;
  portalChecked?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [feeLimited, setFeeLimited] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [ready, setReady] = useState(Boolean(portalChecked && portalState));

  useEffect(() => {
    if (portalChecked && portalState) {
      const restricted = portalState.portalAccessRestricted;
      const source = portalState.portalRestrictionSource;
      setFeeLimited(restricted && source === "fee");
      setReason(portalState.portalRestrictionReason ?? null);
      setReady(true);
      return;
    }
    authFetch("/api/auth/me")
      .then(async (r) => {
        const d = await r.json().catch(() => null);
        const source = d?.portalRestrictionSource;
        const restricted = Boolean(d?.portalAccessRestricted);
        setFeeLimited(restricted && source === "fee");
        setReason(typeof d?.portalRestrictionReason === "string" ? d.portalRestrictionReason : null);
      })
      .finally(() => setReady(true));
  }, [portalChecked, portalState]);

  useEffect(() => {
    if (!ready || !feeLimited) return;
    if (!pathAllowed(pathname)) {
      router.replace("/dashboard/fees?tab=payments&status=PENDING");
    }
  }, [ready, feeLimited, pathname, router]);

  return (
    <>
      {ready && feeLimited && (
        <div className="pointer-events-none fixed inset-0 z-[80] flex items-start justify-center pt-24 px-4">
          <div className="pointer-events-auto max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-lg dark:border-amber-900/50 dark:bg-amber-950/40">
            <h2 className="text-base font-bold text-amber-950 dark:text-amber-100">Fee access is limited</h2>
            <p className="mt-2 text-sm text-amber-900/90 dark:text-amber-200/90">
              {reason ?? "Please complete pending fee payments."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/dashboard/fees?tab=payments"
                className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
              >
                Fee payments
              </Link>
              <Link
                href="/dashboard/settings"
                className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100 dark:hover:bg-amber-900"
              >
                Settings
              </Link>
            </div>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
