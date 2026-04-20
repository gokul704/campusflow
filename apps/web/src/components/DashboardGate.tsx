"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authFetch } from "@/lib/api";
import SidebarNav from "@/components/SidebarNav";
import TopHeader from "@/components/TopHeader";
import PortalAccessGuard from "@/components/PortalAccessGuard";

type MeJson = {
  portalAccessRestricted?: boolean;
  portalRestrictionReason?: string | null;
  portalRestrictionSource?: "manual" | "fee" | null;
};
type PortalState = {
  portalAccessRestricted: boolean;
  portalRestrictionReason: string | null;
  portalRestrictionSource: "manual" | "fee" | null;
};

function ManualRestrictionScreen({ reason }: { reason: string }) {
  const router = useRouter();

  function signOut() {
    document.cookie = "cf_token=; path=/; max-age=0";
    document.documentElement.classList.remove("dark");
    localStorage.setItem("cf_theme", "light");
    router.push("/login");
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950 px-6 text-center">
      <div className="max-w-lg rounded-2xl border border-slate-700 bg-slate-900/95 p-8 shadow-2xl">
        <h1 className="text-lg font-semibold text-white">Portal access restricted</h1>
        <p className="mt-1 text-sm text-slate-400">Your account can sign in, but the portal is limited by the institute.</p>
        <div className="mt-6 rounded-xl border border-amber-500/40 bg-amber-950/50 p-4 text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-200/90">Message from administration</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-amber-50">{reason}</p>
        </div>
        <p className="mt-6 text-xs text-slate-500">
          If you believe this is a mistake, contact the office. You can sign out below.
        </p>
        <button
          type="button"
          onClick={signOut}
          className="mt-6 w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

export default function DashboardGate({
  token,
  children,
}: {
  token: string;
  children: React.ReactNode;
}) {
  const [gate, setGate] = useState<"manual" | "ok">("ok");
  const [manualReason, setManualReason] = useState("");
  const [portalState, setPortalState] = useState<PortalState | null>(null);
  const [portalChecked, setPortalChecked] = useState(false);

  useEffect(() => {
    authFetch("/api/auth/me")
      .then(async (r) => {
        const d = (await r.json().catch(() => null)) as MeJson | null;
        if (!r.ok || !d) {
          setPortalState({
            portalAccessRestricted: false,
            portalRestrictionReason: null,
            portalRestrictionSource: null,
          });
          setGate("ok");
          return;
        }
        const next: PortalState = {
          portalAccessRestricted: Boolean(d.portalAccessRestricted),
          portalRestrictionReason:
            typeof d.portalRestrictionReason === "string" ? d.portalRestrictionReason : null,
          portalRestrictionSource: d.portalRestrictionSource ?? null,
        };
        setPortalState(next);
        const manual =
          next.portalAccessRestricted && next.portalRestrictionSource === "manual";
        if (manual) {
          setManualReason(
            typeof next.portalRestrictionReason === "string" && next.portalRestrictionReason.trim()
              ? next.portalRestrictionReason.trim()
              : "Portal access has been suspended by the institute."
          );
          setGate("manual");
          return;
        }
        setGate("ok");
      })
      .catch(() => {
        setPortalState({
          portalAccessRestricted: false,
          portalRestrictionReason: null,
          portalRestrictionSource: null,
        });
        setGate("ok");
      })
      .finally(() => setPortalChecked(true));
  }, []);

  if (gate === "manual") {
    return <ManualRestrictionScreen reason={manualReason} />;
  }

  return (
    <div className="h-screen flex overflow-hidden bg-indigo-50 text-gray-900 transition-colors dark:bg-gray-950 dark:text-white">
      <SidebarNav />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <TopHeader token={token} />
        <main className="min-h-0 flex-1 overflow-auto p-5 dark:bg-gray-950">
          <Suspense fallback={null}>
            <PortalAccessGuard portalState={portalState} portalChecked={portalChecked}>
              {children}
            </PortalAccessGuard>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
