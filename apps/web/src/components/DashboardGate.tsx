"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authFetch } from "@/lib/api";
import { isLeadershipRole } from "@/lib/leadershipRoles";
import SidebarNav from "@/components/SidebarNav";
import TopHeader from "@/components/TopHeader";
import PortalAccessGuard from "@/components/PortalAccessGuard";

type MeJson = {
  user?: { role?: string };
  profile?: { role?: string };
  portalAccessRestricted?: boolean;
  portalRestrictionReason?: string | null;
  portalRestrictionSource?: "manual" | "fee" | null;
};
type PortalState = {
  portalAccessRestricted: boolean;
  portalRestrictionReason: string | null;
  portalRestrictionSource: "manual" | "fee" | null;
};
type PermCell = { view: boolean; create: boolean; edit: boolean; delete: boolean };
type ModulesMap = Record<string, PermCell>;

function moduleForPath(pathname: string): string {
  if (pathname === "/dashboard") return "dashboard";
  if (pathname.startsWith("/dashboard/settings")) return "settings";
  if (pathname.startsWith("/dashboard/onboarding")) return "onboarding";
  if (pathname.startsWith("/dashboard/students")) return "students";
  if (pathname.startsWith("/dashboard/faculty")) return "faculty";
  if (pathname.startsWith("/dashboard/users")) return "users";
  if (pathname.startsWith("/dashboard/courses")) return "courses";
  if (pathname.startsWith("/dashboard/batches")) return "batches";
  if (pathname.startsWith("/dashboard/departments")) return "departments";
  if (pathname.startsWith("/dashboard/fees")) return "fees";
  if (pathname.startsWith("/dashboard/events")) return "events";
  if (pathname.startsWith("/dashboard/digital-library")) return "digitalLibrary";
  if (pathname.startsWith("/dashboard/batch-courses")) return "batchCourses";
  if (pathname.startsWith("/dashboard/timetable")) return "timetable";
  if (pathname.startsWith("/dashboard/attendance")) return "attendance";
  if (pathname.startsWith("/dashboard/assignments")) return "assignments";
  if (pathname.startsWith("/dashboard/exam-grades")) return "examGrades";
  if (pathname.startsWith("/dashboard/reports")) return "reports";
  return "dashboard";
}

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
  const pathname = usePathname();
  const [gate, setGate] = useState<"manual" | "ok">("ok");
  const [manualReason, setManualReason] = useState("");
  const [portalState, setPortalState] = useState<PortalState | null>(null);
  const [portalChecked, setPortalChecked] = useState(false);
  const [modules, setModules] = useState<ModulesMap | null>(null);
  const [modulesChecked, setModulesChecked] = useState(false);
  const [meRole, setMeRole] = useState<string>("");

  useEffect(() => {
    authFetch("/api/auth/me")
      .then(async (r) => {
        const d = (await r.json().catch(() => null)) as MeJson | null;
        if (!r.ok || !d) {
          setMeRole("");
          setPortalState({
            portalAccessRestricted: false,
            portalRestrictionReason: null,
            portalRestrictionSource: null,
          });
          setGate("ok");
          return;
        }
        const role =
          typeof d.user?.role === "string"
            ? d.user.role
            : typeof d.profile?.role === "string"
              ? d.profile.role
              : "";
        setMeRole(role);
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
        setMeRole("");
        setPortalState({
          portalAccessRestricted: false,
          portalRestrictionReason: null,
          portalRestrictionSource: null,
        });
        setGate("ok");
      })
      .finally(() => setPortalChecked(true));

    authFetch("/api/auth/permissions")
      .then(async (r) => {
        const d = await r.json().catch(() => null);
        if (r.ok && d?.modules && typeof d.modules === "object") {
          setModules(d.modules as ModulesMap);
        } else {
          setModules(null);
        }
      })
      .catch(() => setModules(null))
      .finally(() => setModulesChecked(true));
  }, []);

  if (gate === "manual") {
    return <ManualRestrictionScreen reason={manualReason} />;
  }

  if (!portalChecked || !modulesChecked) {
    return (
      <div className="h-screen flex items-center justify-center bg-indigo-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
          <span
            className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-500 dark:border-gray-700 dark:border-t-indigo-400"
            aria-hidden="true"
          />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  if (pathname.startsWith("/dashboard/settings/permissions") && !isLeadershipRole(meRole)) {
    return (
      <div className="h-screen flex items-center justify-center bg-indigo-50 px-4 dark:bg-gray-950">
        <div className="max-w-md rounded-xl border border-amber-200 bg-white p-6 text-center shadow-sm dark:border-amber-900/40 dark:bg-gray-900">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Admin only</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Only Administrator, CMD, or Principal can open Roles & permissions. Per-user job roles are changed from{" "}
            <Link href="/dashboard/users" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
              Users
            </Link>
            .
          </p>
          <Link href="/dashboard/settings" className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
            Back to settings
          </Link>
        </div>
      </div>
    );
  }

  const module = moduleForPath(pathname);
  const deniedByModule = Boolean(modules && modules[module] && modules[module].view === false);
  if (deniedByModule) {
    return (
      <div className="h-screen flex items-center justify-center bg-indigo-50 px-4 dark:bg-gray-950">
        <div className="max-w-md rounded-xl border border-red-200 bg-white p-6 text-center shadow-sm dark:border-red-900/50 dark:bg-gray-900">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Access denied</h1>
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            You do not have permission to access this page.
          </p>
          <Link href="/dashboard" className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
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
