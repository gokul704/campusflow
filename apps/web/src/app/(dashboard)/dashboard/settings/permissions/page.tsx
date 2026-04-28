"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authFetch, formatApiError } from "@/lib/api";
import { dash } from "@/lib/dashboardUi";
import { isLeadershipRole } from "@/lib/leadershipRoles";

/** Mirrors `MODULE_KEYS` in `apps/api/src/lib/tenantAccessMatrix.ts` (no legacy `sections` key). */
const ROLE_OPTIONS = [
  "ADMIN",
  "CMD",
  "PRINCIPAL",
  "ASSISTANT_PROFESSOR",
  "PROFESSOR",
  "CLINICAL_STAFF",
  "GUEST_PROFESSOR",
  "OPERATIONS",
  "ACCOUNTS",
  "IT_STAFF",
  "STUDENT",
  "ALUMNI",
  "GUEST_STUDENT",
] as const;
const MODULE_OPTIONS = [
  "dashboard",
  "onboarding",
  "students",
  "faculty",
  "users",
  "courses",
  "batches",
  "departments",
  "fees",
  "events",
  "batchCourses",
  "timetable",
  "attendance",
  "assignments",
  "examGrades",
  "reports",
  "digitalLibrary",
  "settings",
] as const;
const ACTIONS = ["view", "create", "edit", "delete"] as const;

type RoleKey = (typeof ROLE_OPTIONS)[number];
type ModuleKey = (typeof MODULE_OPTIONS)[number];
type ActionKey = (typeof ACTIONS)[number];
type ModulePerm = { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
type RoleMatrix = Partial<Record<ModuleKey, ModulePerm>>;
type AccessMatrix = Partial<Record<RoleKey, RoleMatrix>> & Record<string, unknown>;

const ROLE_LABELS: Record<RoleKey, string> = {
  ADMIN: "Administrator",
  CMD: "CMD (Managing Director)",
  PRINCIPAL: "Principal",
  ASSISTANT_PROFESSOR: "Assistant Professor",
  PROFESSOR: "Professor",
  CLINICAL_STAFF: "Clinical Staff",
  GUEST_PROFESSOR: "Guest Professor",
  OPERATIONS: "Operations",
  ACCOUNTS: "Accounts",
  IT_STAFF: "IT Staff",
  STUDENT: "Student",
  ALUMNI: "Alumni",
  GUEST_STUDENT: "Guest Student",
};

const MODULE_LABELS: Record<ModuleKey, string> = {
  dashboard: "Dashboard",
  onboarding: "Onboarding",
  students: "Students",
  faculty: "Faculty",
  users: "Users",
  courses: "Courses",
  batches: "Batches",
  departments: "Departments",
  fees: "Fee Management",
  events: "Events",
  digitalLibrary: "Digital Library",
  batchCourses: "Batch Courses",
  timetable: "Timetable",
  attendance: "Attendance",
  assignments: "Assignments",
  examGrades: "Exam Grades",
  reports: "Reports",
  settings: "Settings",
};

export default function AccessMatrixSettingsPage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<RoleKey>("ADMIN");
  const [moduleQuery, setModuleQuery] = useState("");
  const [matrix, setMatrix] = useState<AccessMatrix>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const me = await authFetch("/api/auth/me");
      const meData = await me.json();
      if (!me.ok) {
        setErr(formatApiError(meData));
        return;
      }
      const r =
        (typeof meData.profile?.role === "string" ? meData.profile.role : undefined) ??
        (typeof meData.user?.role === "string" ? meData.user.role : undefined);
      setRole(r ?? null);
      if (!r || !isLeadershipRole(r)) {
        setErr("Only Admin, CMD, or Principal can edit the access matrix.");
        setLoading(false);
        return;
      }
      const res = await authFetch("/api/tenant/access-settings");
      const data = await res.json();
      if (!res.ok) {
        setErr(formatApiError(data));
        return;
      }
      const incoming = data.accessMatrix;
      setMatrix(incoming && typeof incoming === "object" ? (incoming as AccessMatrix) : {});
    } catch {
      setErr("Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rolePatch = (matrix[selectedRole] && typeof matrix[selectedRole] === "object" ? matrix[selectedRole] : {}) as RoleMatrix;

  function setPerm(module: ModuleKey, action: ActionKey, value: boolean) {
    setMatrix((prev) => {
      const next = { ...prev } as AccessMatrix;
      const roleData = (next[selectedRole] && typeof next[selectedRole] === "object"
        ? { ...(next[selectedRole] as RoleMatrix) }
        : {}) as RoleMatrix;
      const moduleData = (roleData[module] && typeof roleData[module] === "object"
        ? { ...(roleData[module] as ModulePerm) }
        : {}) as ModulePerm;

      moduleData[action] = value;
      roleData[module] = moduleData;
      next[selectedRole] = roleData;
      return next;
    });
  }

  function clearActionOverride(module: ModuleKey, action: ActionKey) {
    setMatrix((prev) => {
      const next = { ...prev } as AccessMatrix;
      const roleData = (next[selectedRole] && typeof next[selectedRole] === "object"
        ? { ...(next[selectedRole] as RoleMatrix) }
        : {}) as RoleMatrix;
      const moduleData = (roleData[module] && typeof roleData[module] === "object"
        ? { ...(roleData[module] as ModulePerm) }
        : {}) as ModulePerm;
      delete moduleData[action];
      if (Object.keys(moduleData).length === 0) {
        delete roleData[module];
      } else {
        roleData[module] = moduleData;
      }
      if (Object.keys(roleData).length === 0) delete next[selectedRole];
      else next[selectedRole] = roleData;
      return next;
    });
  }

  function clearModuleOverride(module: ModuleKey) {
    setMatrix((prev) => {
      const next = { ...prev } as AccessMatrix;
      const roleData = (next[selectedRole] && typeof next[selectedRole] === "object"
        ? { ...(next[selectedRole] as RoleMatrix) }
        : {}) as RoleMatrix;
      delete roleData[module];
      if (Object.keys(roleData).length === 0) delete next[selectedRole];
      else next[selectedRole] = roleData;
      return next;
    });
  }

  function resetAllOverrides() {
    setMatrix({});
    setMsg("Reset done. Click Save to apply server defaults for all roles.");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    setSaving(true);
    try {
      const res = await authFetch("/api/tenant/access-settings", {
        method: "PUT",
        body: JSON.stringify({ accessMatrix: matrix }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(formatApiError(data));
        return;
      }
      setMsg("Saved. Users may need to refresh to pick up sidebar changes.");
      const incoming = data.accessMatrix;
      setMatrix(incoming && typeof incoming === "object" ? (incoming as AccessMatrix) : {});
    } catch {
      setErr("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  const visibleModules = useMemo(() => {
    const q = moduleQuery.trim().toLowerCase();
    if (!q) return [...MODULE_OPTIONS];
    return MODULE_OPTIONS.filter((module) => {
      return module.toLowerCase().includes(q) || MODULE_LABELS[module].toLowerCase().includes(q);
    });
  }, [moduleQuery]);

  const roleOverrideCount = Object.keys(rolePatch).length;

  if (loading) {
    return (
      <div>
        <h1 className={dash.pageTitle}>Access matrix</h1>
        <p className="mt-2 text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  if (role && !isLeadershipRole(role)) {
    return (
      <div>
        <h1 className={dash.pageTitle}>Access matrix</h1>
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{err ?? "You do not have access to this page."}</p>
        <Link href="/dashboard/settings" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
          ← Back to settings
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/settings" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
          ← Settings
        </Link>
        <h1 className={dash.pageTitle}>Roles & permissions</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage access per role using toggles. The <code className="rounded bg-gray-100 px-1 text-xs dark:bg-gray-800">view</code> toggle
          controls whether that module appears in the left navigation for that role.
        </p>
      </div>

      <form onSubmit={save} className={`${dash.card} p-6 space-y-4`}>
        {err && <p className="text-sm text-red-600 dark:text-red-400">{err}</p>}
        {msg && <p className="text-sm text-emerald-600 dark:text-emerald-400">{msg}</p>}

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/40">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Choose role</h2>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              {roleOverrideCount} module override{roleOverrideCount === 1 ? "" : "s"}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {ROLE_OPTIONS.map((r) => {
              const active = selectedRole === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedRole(r)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                  }`}
                >
                  {ROLE_LABELS[r]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/40">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Permissions matrix</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Set each permission to Default, On, or Off.</p>
            </div>
            <input
              type="text"
              placeholder="Search module..."
              value={moduleQuery}
              onChange={(e) => setModuleQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs sm:w-64 dark:border-gray-600 dark:bg-gray-900"
            />
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 text-xs dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800/60">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">Module</th>
                  {ACTIONS.map((a) => (
                    <th key={a} className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                      {a}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right font-semibold text-gray-600 dark:text-gray-300">Reset</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {visibleModules.map((module) => {
                  const cell = (rolePatch[module] ?? {}) as ModulePerm;
                  return (
                    <tr key={module} className="bg-white dark:bg-transparent">
                      <td className="px-3 py-2 align-top">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{MODULE_LABELS[module]}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                          Nav: {cell.view === undefined ? "default" : cell.view ? "shown" : "hidden"}
                        </p>
                      </td>
                      {ACTIONS.map((action) => {
                        const state = cell[action];
                        return (
                          <td key={action} className="px-3 py-2">
                            <div className="inline-flex rounded-md border border-gray-300 dark:border-gray-600">
                              <button
                                type="button"
                                onClick={() => clearActionOverride(module, action)}
                                className={`px-2 py-1 ${state === undefined ? "bg-gray-700 text-white dark:bg-gray-200 dark:text-gray-900" : "text-gray-600 dark:text-gray-300"}`}
                              >
                                D
                              </button>
                              <button
                                type="button"
                                onClick={() => setPerm(module, action, true)}
                                className={`border-l border-gray-300 px-2 py-1 dark:border-gray-600 ${state === true ? "bg-emerald-600 text-white" : "text-gray-600 dark:text-gray-300"}`}
                              >
                                On
                              </button>
                              <button
                                type="button"
                                onClick={() => setPerm(module, action, false)}
                                className={`border-l border-gray-300 px-2 py-1 dark:border-gray-600 ${state === false ? "bg-rose-600 text-white" : "text-gray-600 dark:text-gray-300"}`}
                              >
                                Off
                              </button>
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          className="rounded-md border border-gray-300 px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                          onClick={() => clearModuleOverride(module)}
                        >
                          Reset row
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {visibleModules.length === 0 && (
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">No modules match your search.</p>
          )}
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className={dash.btnPrimary}>
            {saving ? "Saving…" : "Save permissions"}
          </button>
          <button
            type="button"
            className={dash.btnSecondary}
            onClick={resetAllOverrides}
          >
            Reset to defaults
          </button>
          <button
            type="button"
            className={dash.btnSecondary}
            onClick={() => router.refresh()}
          >
            Refresh app
          </button>
        </div>
      </form>
    </div>
  );
}
