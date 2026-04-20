"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/api";
import { BulkImportSectionsCallout } from "@/components/dashboard/BulkImportGuide";
import { dash } from "@/lib/dashboardUi";

interface Section {
  id: string;
  name: string;
  batch: { name: string };
  _count: { students: number };
}

interface Batch { id: string; name: string; }

export default function SectionsPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [filterBatchId, setFilterBatchId] = useState("");
  const [loading, setLoading] = useState(true);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ batchId: "", name: "" });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  async function fetchSections() {
    setLoading(true);
    const p = new URLSearchParams();
    if (filterBatchId) p.set("batchId", filterBatchId);
    const res = await authFetch(`/api/sections?${p}`);
    const data = await res.json();
    setSections(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    authFetch("/api/batches").then(r => r.json()).then(d => setBatches(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => { fetchSections(); }, [filterBatchId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);
    try {
      const res = await authFetch("/api/sections", {
        method: "POST",
        body: JSON.stringify({ batchId: form.batchId, name: form.name }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? "Failed to create section"); return; }
      setShowForm(false);
      setForm({ batchId: "", name: "" });
      fetchSections();
    } catch { setFormError("Something went wrong"); }
    finally { setFormLoading(false); }
  }

  async function handleDelete(section: Section) {
    if (!confirm(`Delete section "${section.name}" from batch "${section.batch.name}"?`)) return;
    const res = await authFetch(`/api/sections/${section.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Failed to delete");
      return;
    }
    fetchSections();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className={dash.pageTitle}>Sections</h1>
        <button
          type="button"
          onClick={() => { setForm({ batchId: "", name: "" }); setFormError(""); setShowForm(true); }}
          className={dash.btnPrimary}
        >
          + Add Section
        </button>
      </div>

      <BulkImportSectionsCallout />

      <div className="mb-4 flex gap-3">
        <select
          value={filterBatchId}
          onChange={e => setFilterBatchId(e.target.value)}
          className={dash.select}
        >
          <option value="">All Batches</option>
          {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      <div className={dash.tableWrap}>
        <table className="w-full text-sm">
          <thead className={dash.thead}>
            <tr>
              <th className={dash.th}>Section Name</th>
              <th className={dash.th}>Batch</th>
              <th className={dash.th}>Students</th>
              <th className={dash.th}>Actions</th>
            </tr>
          </thead>
          <tbody className={dash.tbodyDivide}>
            {loading ? (
              <tr><td colSpan={4} className={dash.emptyCell}>Loading...</td></tr>
            ) : sections.length === 0 ? (
              <tr><td colSpan={4} className={dash.emptyCell}>No sections found. Create one to get started.</td></tr>
            ) : sections.map(s => (
              <tr key={s.id} className={dash.rowHover}>
                <td className={`px-4 py-3 ${dash.cellStrong}`}>{s.name}</td>
                <td className={`px-4 py-3 ${dash.cellMuted}`}>{s.batch.name}</td>
                <td className={`px-4 py-3 ${dash.cellMuted}`}>{s._count.students}</td>
                <td className="px-4 py-3">
                  <button type="button" onClick={() => handleDelete(s)} className={dash.btnDanger}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className={dash.modalOverlay}>
          <div className={`${dash.modalPanel} max-w-sm`}>
            <h2 className={`${dash.sectionTitle} mb-4`}>Add Section</h2>
            {formError && <div className={dash.errorBanner}>{formError}</div>}
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className={dash.label}>Batch</label>
                <select
                  value={form.batchId}
                  onChange={e => setForm(f => ({ ...f, batchId: e.target.value }))}
                  required
                  className={dash.selectFull}
                >
                  <option value="">Select batch</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className={dash.label}>Section Name</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                  placeholder="e.g. A, B, C"
                  className={dash.input}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className={`flex-1 ${dash.btnSecondary}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className={`flex-1 ${dash.btnPrimary}`}
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
