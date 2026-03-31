"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/api";
import { dash } from "@/lib/dashboardUi";

interface Batch {
  id: string;
  name: string;
  startYear: number;
  endYear: number;
  isActive: boolean;
  _count: { students: number };
}

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", startYear: "", endYear: "" });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  async function fetchBatches() {
    setLoading(true);
    try {
      const res = await authFetch("/api/batches");
      const raw = await res.json();
      setBatches(Array.isArray(raw) ? raw : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchBatches(); }, []);

  // Auto-fill name when years are entered
  function handleYearChange(field: "startYear" | "endYear", value: string) {
    const updated = { ...form, [field]: value };
    if (updated.startYear && updated.endYear) {
      updated.name = `${updated.startYear}-${updated.endYear}`;
    }
    setForm(updated);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);
    try {
      const res = await authFetch("/api/batches", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          startYear: Number(form.startYear),
          endYear: Number(form.endYear),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? "Failed"); return; }
      setShowForm(false);
      setForm({ name: "", startYear: "", endYear: "" });
      fetchBatches();
    } catch { setFormError("Something went wrong"); }
    finally { setFormLoading(false); }
  }

  async function toggleActive(batch: Batch) {
    await authFetch(`/api/batches/${batch.id}`, {
      method: "PUT",
      body: JSON.stringify({ isActive: !batch.isActive }),
    });
    fetchBatches();
  }

  async function handleDelete(batch: Batch) {
    if (!confirm(`Delete batch "${batch.name}"?`)) return;
    const res = await authFetch(`/api/batches/${batch.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    fetchBatches();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className={dash.pageTitle}>Batches</h1>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition hover:bg-blue-700"
        >
          + New Batch
        </button>
      </div>

      <div className={dash.tableWrap}>
        <table className="w-full text-sm">
          <thead className={dash.thead}>
            <tr>
              <th className={dash.th}>Batch</th>
              <th className={dash.th}>Years</th>
              <th className={dash.th}>Students</th>
              <th className={dash.th}>Status</th>
              <th className={dash.th}>Actions</th>
            </tr>
          </thead>
          <tbody className={dash.tbodyDivide}>
            {loading ? (
              <tr>
                <td colSpan={5} className={dash.emptyCell}>
                  Loading...
                </td>
              </tr>
            ) : batches.length === 0 ? (
              <tr>
                <td colSpan={5} className={dash.emptyCell}>
                  No batches yet. Create one to get started.
                </td>
              </tr>
            ) : (
              batches.map((b) => (
                <tr
                  key={b.id}
                  className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/80"
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{b.name}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {b.startYear} – {b.endYear}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{b._count.students}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        b.isActive
                          ? "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      {b.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => toggleActive(b)}
                        className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        {b.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(b)}
                        className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:border dark:border-gray-800 dark:bg-gray-900">
            <h2 className={`${dash.sectionTitle} mb-4`}>New Batch</h2>
            {formError && (
              <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                {formError}
              </div>
            )}
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Start Year
                  </label>
                  <input
                    type="number"
                    min={2000}
                    max={2100}
                    value={form.startYear}
                    onChange={(e) => handleYearChange("startYear", e.target.value)}
                    required
                    placeholder="2024"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    End Year
                  </label>
                  <input
                    type="number"
                    min={2000}
                    max={2100}
                    value={form.endYear}
                    onChange={(e) => handleYearChange("endYear", e.target.value)}
                    required
                    placeholder="2027"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-950 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Batch Name
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  placeholder="2024-2027"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-950 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  Auto-filled from years, you can edit
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {formLoading ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
