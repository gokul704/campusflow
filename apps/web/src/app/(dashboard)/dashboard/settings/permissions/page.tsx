"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authFetch, formatApiError } from "@/lib/api";
import { dash } from "@/lib/dashboardUi";

const LEADERSHIP = new Set(["ADMIN", "CMD", "PRINCIPAL"]);

export default function AccessMatrixSettingsPage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [jsonText, setJsonText] = useState("");
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
      const r = meData.profile?.role as string | undefined;
      setRole(r ?? null);
      if (!r || !LEADERSHIP.has(r)) {
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
      setJsonText(JSON.stringify(data.accessMatrix ?? {}, null, 2));
    } catch {
      setErr("Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    setSaving(true);
    try {
      let parsed: unknown = {};
      try {
        parsed = jsonText.trim() === "" ? {} : JSON.parse(jsonText);
      } catch {
        setErr("Invalid JSON.");
        setSaving(false);
        return;
      }
      const res = await authFetch("/api/tenant/access-settings", {
        method: "PUT",
        body: JSON.stringify({ accessMatrix: parsed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(formatApiError(data));
        return;
      }
      setMsg("Saved. Users may need to refresh to pick up sidebar changes.");
      setJsonText(JSON.stringify(data.accessMatrix ?? {}, null, 2));
    } catch {
      setErr("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className={dash.pageTitle}>Access matrix</h1>
        <p className="mt-2 text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  if (role && !LEADERSHIP.has(role)) {
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
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/dashboard/settings" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
          ← Settings
        </Link>
        <h1 className={dash.pageTitle}>Tenant access matrix</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          JSON overrides per role and module. Keys are{" "}
          <code className="rounded bg-gray-100 px-1 text-xs dark:bg-gray-800">ADMIN</code>,{" "}
          <code className="rounded bg-gray-100 px-1 text-xs dark:bg-gray-800">PRESENT_STUDENT</code>, etc., and module keys such as{" "}
          <code className="rounded bg-gray-100 px-1 text-xs dark:bg-gray-800">fees</code>,{" "}
          <code className="rounded bg-gray-100 px-1 text-xs dark:bg-gray-800">students</code>. Each module supports{" "}
          <code className="rounded bg-gray-100 px-1 text-xs dark:bg-gray-800">view</code>,{" "}
          <code className="rounded bg-gray-100 px-1 text-xs dark:bg-gray-800">create</code>,{" "}
          <code className="rounded bg-gray-100 px-1 text-xs dark:bg-gray-800">edit</code>,{" "}
          <code className="rounded bg-gray-100 px-1 text-xs dark:bg-gray-800">delete</code>. Empty object resets to server defaults.
        </p>
      </div>

      <form onSubmit={save} className={`${dash.card} p-6 space-y-4`}>
        {err && <p className="text-sm text-red-600 dark:text-red-400">{err}</p>}
        {msg && <p className="text-sm text-emerald-600 dark:text-emerald-400">{msg}</p>}
        <textarea
          className="min-h-[320px] w-full rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          spellCheck={false}
        />
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className={dash.btnPrimary}>
            {saving ? "Saving…" : "Save matrix"}
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
