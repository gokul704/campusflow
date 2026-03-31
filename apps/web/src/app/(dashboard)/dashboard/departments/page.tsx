"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/api";
import { dash } from "@/lib/dashboardUi";

interface Department {
  id: string;
  name: string;
  code: string;
}

export default function DepartmentsPage() {
  const [depts, setDepts] = useState<Department[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function fetchDepts() {
    const res = await authFetch("/api/departments");
    const data = await res.json();
    setDepts(data);
  }

  useEffect(() => { fetchDepts(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authFetch("/api/departments", {
        method: "POST",
        body: JSON.stringify({ name, code }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      setName(""); setCode("");
      fetchDepts();
    } catch { setError("Something went wrong"); }
    finally { setLoading(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this department?")) return;
    await authFetch(`/api/departments/${id}`, { method: "DELETE" });
    fetchDepts();
  }

  return (
    <div>
      <h1 className={`${dash.pageTitle} mb-6`}>Departments</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Create form */}
        <div className={`${dash.card} p-6`}>
          <h2 className={`${dash.sectionTitle} mb-4 text-base`}>Add Department</h2>
          {error && <div className={dash.errorBanner}>{error}</div>}
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className={dash.label}>Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Computer Science"
                className={dash.input}
              />
            </div>
            <div>
              <label className={dash.label}>Code</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
                maxLength={10}
                placeholder="CS"
                className={dash.input}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full ${dash.btnPrimary} py-2`}
            >
              {loading ? "Adding..." : "Add Department"}
            </button>
          </form>
        </div>

        {/* List */}
        <div className={`${dash.tableWrap} lg:col-span-2`}>
          <table className="w-full text-sm">
            <thead className={dash.thead}>
              <tr>
                <th className={dash.th}>Name</th>
                <th className={dash.th}>Code</th>
                <th className={dash.th}>Actions</th>
              </tr>
            </thead>
            <tbody className={dash.tbodyDivide}>
              {depts.length === 0 ? (
                <tr><td colSpan={3} className={dash.emptyCell}>No departments yet</td></tr>
              ) : depts.map((dept) => (
                <tr key={dept.id} className={dash.rowHover}>
                  <td className={`px-4 py-3 ${dash.cellStrong}`}>{dept.name}</td>
                  <td className="px-4 py-3">
                    <span className={`${dash.badge} font-mono`}>{dept.code}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleDelete(dept.id)}
                      className={dash.btnDanger}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
