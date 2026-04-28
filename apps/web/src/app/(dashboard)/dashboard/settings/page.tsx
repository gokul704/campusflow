"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authFetch, formatApiError } from "@/lib/api";
import { dash } from "@/lib/dashboardUi";
import { isLeadershipRole } from "@/lib/leadershipRoles";

interface Profile {
  id: string;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  role: string;
  dateOfBirth: string | null;
  isActive: boolean;
  designation: string | null;
  levelLabel: string | null;
}


const ROLE_LABELS: Record<string, string> = {
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
  GUEST_STUDENT: "Guest student",
};

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const [curPwd, setCurPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [newPwd2, setNewPwd2] = useState("");
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);
  const [pwdErr, setPwdErr] = useState<string | null>(null);
  const [pwdSaving, setPwdSaving] = useState(false);

  const [restricted, setRestricted] = useState<
    Array<{
      studentId: string;
      rollNumber: string;
      batchName: string;
      reason: string | null;
      user: { firstName: string; lastName: string; email: string };
    }>
  >([]);
  const [restrictedErr, setRestrictedErr] = useState<string | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setSaveErr(null);
    try {
      const res = await authFetch("/api/auth/me");
      const data = await res.json();
      if (!res.ok) {
        setSaveErr(formatApiError(data));
        return;
      }
      const p = data.profile as Profile;
      setProfile(p);
      setFirstName(p.firstName);
      setLastName(p.lastName);
      setPhone(p.phone ?? "");
    } catch {
      setSaveErr("Could not load profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    authFetch("/api/auth/permissions")
      .then(async (r) => {
        const d = await r.json().catch(() => null);
        setAllowed(Boolean(d?.modules?.settings?.view));
      })
      .catch(() => setAllowed(false));
  }, []);

  useEffect(() => {
    if (!profile || !isLeadershipRole(profile.role)) return;
    authFetch("/api/students/restricted")
      .then(async (r) => {
        const d = await r.json().catch(() => null);
        if (!r.ok) {
          setRestrictedErr(typeof d?.error === "string" ? d.error : "Could not load restricted list");
          return;
        }
        setRestricted(Array.isArray(d) ? d : []);
      })
      .catch(() => setRestrictedErr("Could not load restricted list"));
  }, [profile]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaveMsg(null);
    setSaveErr(null);
    setSaving(true);
    try {
      const res = await authFetch("/api/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({ firstName, lastName, phone: phone.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveErr(formatApiError(data));
        return;
      }
      if (typeof data.token === "string") {
        document.cookie = `cf_token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict`;
        router.refresh();
      }
      setSaveMsg("Profile saved.");
      await load();
    } catch {
      setSaveErr("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdMsg(null);
    setPwdErr(null);
    if (newPwd !== newPwd2) {
      setPwdErr("New passwords do not match.");
      return;
    }
    if (newPwd.length < 8) {
      setPwdErr("New password must be at least 8 characters.");
      return;
    }
    setPwdSaving(true);
    try {
      const res = await authFetch("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword: curPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwdErr(formatApiError(data));
        return;
      }
      if (typeof data.token === "string") {
        document.cookie = `cf_token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict`;
        router.refresh();
      }
      setPwdMsg(data.message ?? "Password changed.");
      setCurPwd("");
      setNewPwd("");
      setNewPwd2("");
    } catch {
      setPwdErr("Request failed.");
    } finally {
      setPwdSaving(false);
    }
  }

  if (loading || allowed == null) {
    return (
      <div>
        <h1 className={dash.pageTitle}>Settings</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className={`${dash.card} p-6`}>
        <h1 className={dash.pageTitle}>Settings</h1>
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">You do not have access to Settings.</p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (!profile) {
    return (
      <div>
        <h1 className={dash.pageTitle}>Settings</h1>
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{saveErr ?? "Could not load profile."}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className={dash.pageTitle}>Settings</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Personal information and password. Role and designation come from your account; contact an administrator to
          change your role.
        </p>
        {isLeadershipRole(profile.role) && (
          <p className="mt-2 text-sm">
            <Link href="/dashboard/settings/permissions" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
              Roles & permissions — set what each role can view and do in the portal
            </Link>
            {" "}
            <span className="text-gray-500 dark:text-gray-400">
              (To change an individual user&apos;s job role, use{" "}
              <Link href="/dashboard/users" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                Users
              </Link>
              .)
            </span>
          </p>
        )}
      </div>

      {isLeadershipRole(profile.role) && (
        <section className={`${dash.card} p-6`}>
          <h2 className={dash.sectionTitle}>Restricted portal access</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Students with overdue fees or a manual lock (Admin / CMD / Principal). Record fee payments under Fee Management;
            restrict or lift a student from{" "}
            <Link href="/dashboard/students" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
              Students
            </Link>{" "}
            → View → Portal access.
          </p>
          {restrictedErr && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{restrictedErr}</p>}
          {!restrictedErr && restricted.length === 0 && (
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">No restricted students right now.</p>
          )}
          {!restrictedErr && restricted.length > 0 && (
            <div className={`${dash.tableWrap} mt-4`}>
              <table className="w-full text-sm">
                <thead className={dash.thead}>
                  <tr>
                    <th className={dash.th}>Roll</th>
                    <th className={dash.th}>Name</th>
                    <th className={dash.th}>Batch</th>
                    <th className={dash.th}>Reason</th>
                  </tr>
                </thead>
                <tbody className={dash.tbodyDivide}>
                  {restricted.map((row) => (
                    <tr key={row.studentId} className={dash.rowHover}>
                      <td className={`px-3 py-2 ${dash.cellMono}`}>{row.rollNumber}</td>
                      <td className={`px-3 py-2 ${dash.cellStrong}`}>
                        {row.user.firstName} {row.user.lastName}
                      </td>
                      <td className={`px-3 py-2 ${dash.cellMuted}`}>{row.batchName}</td>
                      <td className={`px-3 py-2 ${dash.cellMuted}`}>{row.reason ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <section className={`${dash.card} p-6`}>
        <h2 className={dash.sectionTitle}>Personal information</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Email</dt>
            <dd className="font-medium text-gray-900 dark:text-white">{profile.email}</dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Role</dt>
            <dd className="font-medium text-gray-900 dark:text-white">
              {ROLE_LABELS[profile.role] ?? profile.role}
            </dd>
          </div>
          {(profile.designation || profile.levelLabel) && (
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Designation / level</dt>
              <dd className="font-medium text-gray-900 dark:text-white">
                {profile.designation && <span className="block">{profile.designation}</span>}
                {profile.levelLabel && <span className="block text-gray-600 dark:text-gray-300">{profile.levelLabel}</span>}
                {!profile.designation && !profile.levelLabel && "—"}
              </dd>
            </div>
          )}
        </dl>

        <form className="mt-6 space-y-4 border-t border-gray-100 pt-6 dark:border-gray-800" onSubmit={saveProfile}>
          <div>
            <label className={dash.label} htmlFor="sf">
              First name
            </label>
            <input id="sf" className={dash.input} value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </div>
          <div>
            <label className={dash.label} htmlFor="sl">
              Last name
            </label>
            <input id="sl" className={dash.input} value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </div>
          <div>
            <label className={dash.label} htmlFor="sp">
              Mobile number
            </label>
            <input id="sp" type="tel" className={dash.input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
          </div>
          {saveErr && <p className="text-sm text-red-600 dark:text-red-400">{saveErr}</p>}
          {saveMsg && <p className="text-sm text-emerald-600 dark:text-emerald-400">{saveMsg}</p>}
          <button type="submit" disabled={saving} className={dash.btnPrimary}>
            {saving ? "Saving…" : "Save profile"}
          </button>
        </form>
      </section>

      <section className={`${dash.card} p-6`}>
        <h2 className={dash.sectionTitle}>Change password</h2>
        <form className="mt-4 space-y-4" onSubmit={changePassword}>
          <div>
            <label className={dash.label} htmlFor="cp">
              Current password
            </label>
            <input
              id="cp"
              type="password"
              autoComplete="current-password"
              className={dash.input}
              value={curPwd}
              onChange={(e) => setCurPwd(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={dash.label} htmlFor="np">
              New password
            </label>
            <input
              id="np"
              type="password"
              autoComplete="new-password"
              className={dash.input}
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div>
            <label className={dash.label} htmlFor="np2">
              Confirm new password
            </label>
            <input
              id="np2"
              type="password"
              autoComplete="new-password"
              className={dash.input}
              value={newPwd2}
              onChange={(e) => setNewPwd2(e.target.value)}
              required
              minLength={8}
            />
          </div>
          {pwdErr && <p className="text-sm text-red-600 dark:text-red-400">{pwdErr}</p>}
          {pwdMsg && <p className="text-sm text-emerald-600 dark:text-emerald-400">{pwdMsg}</p>}
          <button type="submit" disabled={pwdSaving} className={dash.btnPrimary}>
            {pwdSaving ? "Updating…" : "Update password"}
          </button>
        </form>
      </section>
    </div>
  );
}
