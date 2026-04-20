"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { authFetch } from "@/lib/api";
import { dash } from "@/lib/dashboardUi";
import CreateUserModal from "./CreateUserModal";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300",
  CMD: "bg-rose-100 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200",
  PRINCIPAL: "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300",
  STAFF: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100",
  OPERATIONS_LECTURER: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  OPERATIONS_HR: "bg-cyan-100 text-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-200",
  OPERATIONS_FRONT_DESK: "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  PRESENT_STUDENT: "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300",
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
  const [showCreate, setShowCreate] = useState(false);

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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className={dash.pageTitle}>Users</h1>
          <p className="mt-1 max-w-2xl text-xs text-gray-500 dark:text-gray-400">
            New accounts appear here immediately. Students are created from the Students page (with roll, batch, and section). Use the institute default password in API .env unless you set one per user.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className={dash.btnPrimary}
        >
          + Create user
        </button>
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
          <option value="STAFF">Staff</option>
          <option value="OPERATIONS_LECTURER">Operations — Lecturer</option>
          <option value="OPERATIONS_HR">Operations — HR</option>
          <option value="OPERATIONS_FRONT_DESK">Operations — Front desk</option>
          <option value="PRESENT_STUDENT">Present student</option>
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
                  <button
                    type="button"
                    onClick={() => toggleActive(user)}
                    className="text-xs text-gray-500 transition hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                  >
                    {user.isActive ? "Deactivate" : "Activate"}
                  </button>
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

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            setPage(1);
            void fetchUsers(1);
          }}
        />
      )}
    </div>
  );
}
