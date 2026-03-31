"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/api";
import { dash } from "@/lib/dashboardUi";
import InviteModal from "./InviteModal";

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
  HOD: "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300",
  FACULTY: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  STUDENT: "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300",
  PARENT: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);

  async function fetchUsers() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("search", search);
    if (role) params.set("role", role);

    const res = await authFetch(`/api/users?${params}`);
    const data = await res.json();
    setUsers(data.users ?? []);
    setTotal(data.pagination?.total ?? 0);
    setLoading(false);
  }

  useEffect(() => { fetchUsers(); }, [page, role]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchUsers(); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  async function toggleActive(user: User) {
    await authFetch(`/api/users/${user.id}/${user.isActive ? "deactivate" : "activate"}`, {
      method: "PATCH",
    });
    fetchUsers();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className={dash.pageTitle}>Users</h1>
        <button
          type="button"
          onClick={() => setShowInvite(true)}
          className={dash.btnPrimary}
        >
          + Invite User
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
          <option value="HOD">HOD</option>
          <option value="FACULTY">Faculty</option>
          <option value="STUDENT">Student</option>
          <option value="PARENT">Parent</option>
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

      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onSuccess={() => { setShowInvite(false); fetchUsers(); }}
        />
      )}
    </div>
  );
}
