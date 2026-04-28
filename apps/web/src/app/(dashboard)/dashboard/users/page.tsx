"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { authFetch, formatApiError } from "@/lib/api";
import { dash } from "@/lib/dashboardUi";
import CreateUserModal from "./CreateUserModal";

interface User {
  id: string;
  email: string;
  phone?: string | null;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const CHANGEABLE_ROLES = [
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

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300",
  CMD: "bg-rose-100 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200",
  PRINCIPAL: "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300",
  ASSISTANT_PROFESSOR: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  PROFESSOR: "bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300",
  CLINICAL_STAFF: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100",
  GUEST_PROFESSOR: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950/40 dark:text-fuchsia-300",
  OPERATIONS: "bg-cyan-100 text-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-200",
  ACCOUNTS: "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  IT_STAFF: "bg-orange-100 text-orange-900 dark:bg-orange-950/40 dark:text-orange-200",
  STUDENT: "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300",
  ALUMNI: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300",
  GUEST_STUDENT: "bg-teal-100 text-teal-900 dark:bg-teal-950/40 dark:text-teal-200",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [meRole, setMeRole] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [roleEditUser, setRoleEditUser] = useState<User | null>(null);
  const [roleEditValue, setRoleEditValue] = useState<string>("ASSISTANT_PROFESSOR");
  const [roleEditErr, setRoleEditErr] = useState("");
  const [roleEditLoading, setRoleEditLoading] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", phone: "" });
  const [editErr, setEditErr] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const isLeadership = meRole === "ADMIN" || meRole === "CMD" || meRole === "PRINCIPAL";

  const searchRef = useRef(search);
  const roleRef = useRef(role);
  searchRef.current = search;
  roleRef.current = role;

  const fetchUsers = useCallback(
    async (pageOverride?: number) => {
      setLoading(true);
      const pageToUse = pageOverride ?? page;
      const params = new URLSearchParams({ page: String(pageToUse), limit: "20" });
      if (searchRef.current) params.set("search", searchRef.current);
      if (roleRef.current) params.set("role", roleRef.current);

      const res = await authFetch(`/api/users?${params}`);
      const data = await res.json();
      setUsers(data.users ?? []);
      setTotal(data.pagination?.total ?? 0);
      setLoading(false);
    },
    [page, role]
  );

  const fetchUsersRef = useRef(fetchUsers);
  fetchUsersRef.current = fetchUsers;

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    authFetch("/api/auth/me")
      .then((r) => r.json())
      .then((d: { user?: { role?: string } }) => setMeRole(d?.user?.role ?? null))
      .catch(() => setMeRole(null));
  }, []);

  // Debounce search only — do not depend on `fetchUsers` or pagination resets when page/role changes
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      void fetchUsersRef.current(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  async function toggleActive(user: User) {
    await authFetch(`/api/users/${user.id}/${user.isActive ? "deactivate" : "activate"}`, {
      method: "PATCH",
    });
    void fetchUsers();
  }

  function openRoleEditor(user: User) {
    setRoleEditUser(user);
    setRoleEditValue(user.role);
    setRoleEditErr("");
  }

  function openEditUser(user: User) {
    setEditUser(user);
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? "",
    });
    setEditErr("");
  }

  async function submitEditUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setEditErr("");
    setEditLoading(true);
    try {
      const body: Record<string, string> = {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
      };
      const ph = editForm.phone.trim();
      if (ph) body.phone = ph;
      const res = await authFetch(`/api/users/${editUser.id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditErr(formatApiError(data));
        return;
      }
      setEditUser(null);
      void fetchUsers();
    } catch {
      setEditErr("Update failed");
    } finally {
      setEditLoading(false);
    }
  }

  async function submitRoleChange(e: React.FormEvent) {
    e.preventDefault();
    if (!roleEditUser) return;
    setRoleEditErr("");
    setRoleEditLoading(true);
    try {
      const res = await authFetch(`/api/users/${roleEditUser.id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: roleEditValue }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRoleEditErr(formatApiError(data));
        return;
      }
      setRoleEditUser(null);
      void fetchUsers();
    } catch {
      setRoleEditErr("Role update failed");
    } finally {
      setRoleEditLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className={dash.pageTitle}>Users</h1>
          <p className="mt-1 max-w-2xl text-xs text-gray-500 dark:text-gray-400">
            New accounts appear here immediately. Students are created from the Students page (with roll, batch, and section). Use the institute default password in API .env unless you set one per user.
          </p>
        </div>
        {isLeadership && (
          <button type="button" onClick={() => setShowCreate(true)} className={dash.btnPrimary}>
            + Create user
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={dash.inputSearch}
        />
        <select
          value={role}
          onChange={(e) => { setRole(e.target.value); setPage(1); }}
          className={dash.select}
        >
          <option value="">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="CMD">CMD (Managing Director)</option>
          <option value="PRINCIPAL">Principal</option>
          <option value="ASSISTANT_PROFESSOR">Assistant Professor</option>
          <option value="PROFESSOR">Professor</option>
          <option value="CLINICAL_STAFF">Clinical Staff</option>
          <option value="GUEST_PROFESSOR">Guest Professor</option>
          <option value="OPERATIONS">Operations</option>
          <option value="ACCOUNTS">Accounts</option>
          <option value="IT_STAFF">IT Staff</option>
          <option value="STUDENT">Student</option>
          <option value="ALUMNI">Alumni</option>
          <option value="GUEST_STUDENT">Guest student</option>
        </select>
      </div>

      <div className={dash.tableWrap}>
        <table className="w-full text-sm">
          <thead className={dash.thead}>
            <tr>
              <th className={dash.th}>Name</th>
              <th className={dash.th}>Email</th>
              <th className={dash.th}>Role</th>
              <th className={dash.th}>Status</th>
              <th className={dash.th}>Actions</th>
            </tr>
          </thead>
          <tbody className={dash.tbodyDivide}>
            {loading ? (
              <tr><td colSpan={5} className={dash.emptyCell}>Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className={dash.emptyCell}>No users found</td></tr>
            ) : users.map((user) => (
              <tr key={user.id} className={dash.rowHover}>
                <td className={`px-4 py-3 ${dash.cellStrong}`}>
                  {user.firstName} {user.lastName}
                </td>
                <td className={`px-4 py-3 ${dash.cellMuted}`}>{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${ROLE_COLORS[user.role] ?? dash.badge}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={user.isActive ? dash.statusPillActive : dash.statusPillInactive}>
                    {user.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {isLeadership ? (
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      <button
                        type="button"
                        onClick={() => openEditUser(user)}
                        className="text-xs text-emerald-600 transition hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => openRoleEditor(user)}
                        className="text-xs text-blue-600 transition hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Change role
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleActive(user)}
                        className="text-xs text-gray-500 transition hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                      >
                        {user.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  ) : (
                    <span className={`text-xs ${dash.cellMuted}`}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {total > 20 && (
          <div className={dash.paginationBar}>
            <span>Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</span>
            <div className="flex gap-2">
              <button type="button" disabled={page === 1} onClick={() => setPage(p => p - 1)} className={dash.paginationBtn}>Prev</button>
              <button type="button" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)} className={dash.paginationBtn}>Next</button>
            </div>
          </div>
        )}
      </div>

      {isLeadership && showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            setPage(1);
            void fetchUsers(1);
          }}
        />
      )}

      {isLeadership && editUser && (
        <div className={dash.modalOverlay}>
          <div className={dash.modalPanel}>
            <h2 className={`${dash.sectionTitle} mb-2`}>Edit user</h2>
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">{editUser.email}</p>
            {editErr && <div className={`${dash.errorBanner} mb-3`}>{editErr}</div>}
            <form onSubmit={submitEditUser} className="space-y-3">
              <div>
                <label className={dash.label}>First name</label>
                <input
                  type="text"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                  required
                  className={dash.input}
                />
              </div>
              <div>
                <label className={dash.label}>Last name</label>
                <input
                  type="text"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                  required
                  className={dash.input}
                />
              </div>
              <div>
                <label className={dash.label}>Phone (optional)</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  className={dash.input}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Email cannot be changed here.</p>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className={`flex-1 ${dash.btnSecondary}`}
                >
                  Cancel
                </button>
                <button type="submit" disabled={editLoading} className={`flex-1 ${dash.btnPrimary}`}>
                  {editLoading ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLeadership && roleEditUser && (
        <div className={dash.modalOverlay}>
          <div className={dash.modalPanel}>
            <h2 className={`${dash.sectionTitle} mb-2`}>Change role</h2>
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
              {roleEditUser.firstName} {roleEditUser.lastName} ({roleEditUser.email})
            </p>
            {roleEditErr && <div className={`${dash.errorBanner} mb-3`}>{roleEditErr}</div>}
            <form onSubmit={submitRoleChange} className="space-y-3">
              <div>
                <label className={dash.label}>New role</label>
                <select
                  value={roleEditValue}
                  onChange={(e) => setRoleEditValue(e.target.value)}
                  className={dash.selectFull}
                >
                  {CHANGEABLE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Student and Guest Student can be switched between each other. Faculty-role assignment still needs the
                dedicated create-user flow (for department/designation capture).
              </p>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setRoleEditUser(null)}
                  className={`flex-1 ${dash.btnSecondary}`}
                >
                  Cancel
                </button>
                <button type="submit" disabled={roleEditLoading} className={`flex-1 ${dash.btnPrimary}`}>
                  {roleEditLoading ? "Saving…" : "Save role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
