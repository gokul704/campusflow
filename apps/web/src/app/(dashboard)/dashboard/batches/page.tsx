"use client";

import { useEffect, useState } from "react";
import { authFetch, formatApiError } from "@/lib/api";
import {
  alertBulkImportSummary,
  downloadExcelTemplate,
  excelCell,
  readExcelFirstSheet,
} from "@/lib/excelImport";
import { BulkImportOrderHint } from "@/components/dashboard/BulkImportGuide";
import { dash } from "@/lib/dashboardUi";

type PermCell = { view: boolean; create: boolean; edit: boolean; delete: boolean };
type ModulesMap = Record<string, PermCell>;

interface Batch {
  id: string;
  name: string;
  startYear: number;
  endYear: number;
  isActive: boolean;
  _count: { students: number };
}

type BatchImportRow = { name: string; startYear: number; endYear: number };

function batchRowFromExcel(r: Record<string, unknown>): BatchImportRow | null {
  let name = excelCell(r, "name", "batch name", "batch");
  const syRaw = excelCell(r, "startyear", "start year", "start_year", "from");
  const eyRaw = excelCell(r, "endyear", "end year", "end_year", "to");
  if (!name && !syRaw && !eyRaw) return null;
  const startYear = Number(syRaw);
  const endYear = Number(eyRaw);
  if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) return null;
  if (!name) name = `${startYear}-${endYear}`;
  return { name, startYear, endYear };
}

export default function BatchesPage() {
  const [modules, setModules] = useState<ModulesMap | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", startYear: "", endYear: "" });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const [showImport, setShowImport] = useState(false);
  const [importRows, setImportRows] = useState<BatchImportRow[]>([]);
  const [importParseError, setImportParseError] = useState("");
  const [importSubmitError, setImportSubmitError] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const canManageBatches = modules?.batches?.create === true;
  const canDeleteBatches = modules?.batches?.delete === true;

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

  useEffect(() => {
    authFetch("/api/auth/permissions")
      .then(async (r) => {
        const d = await r.json().catch(() => null);
        if (r.ok && d?.modules && typeof d.modules === "object") setModules(d.modules as ModulesMap);
        else setModules(null);
      })
      .catch(() => setModules(null));
    fetchBatches();
  }, []);

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

  function openImport() {
    setImportRows([]);
    setImportParseError("");
    setImportSubmitError("");
    setShowImport(true);
  }

  async function handleExcelFile(file: File) {
    setImportParseError("");
    try {
      const raw = await readExcelFirstSheet(file);
      const rows: BatchImportRow[] = [];
      for (const row of raw) {
        const parsed = batchRowFromExcel(row);
        if (!parsed) continue;
        rows.push(parsed);
      }
      if (rows.length === 0) {
        setImportParseError('No valid rows. Use columns "Name" (optional if years set), "Start Year", "End Year".');
        return;
      }
      setImportRows(rows);
    } catch {
      setImportParseError("Could not read the Excel file.");
    }
  }

  async function handleBulkSubmit(e: React.FormEvent) {
    e.preventDefault();
    setImportSubmitError("");
    if (importRows.length === 0) {
      setImportSubmitError("Parse an Excel file first.");
      return;
    }
    setImportLoading(true);
    try {
      const res = await authFetch("/api/batches/bulk", {
        method: "POST",
        body: JSON.stringify({ rows: importRows }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setImportSubmitError(formatApiError(data));
        return;
      }
      setShowImport(false);
      void fetchBatches();
      alertBulkImportSummary(data.created ?? 0, data.failed ?? []);
    } catch {
      setImportSubmitError("Request failed");
    } finally {
      setImportLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className={dash.pageTitle}>Batches</h1>
        {canManageBatches ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                downloadExcelTemplate("batches-import-template.xlsx", "Batches", ["Name", "Start Year", "End Year"])
              }
              className={dash.btnSecondary}
            >
              Download Excel template
            </button>
            <button type="button" onClick={openImport} className={dash.btnSecondary}>
              Import Excel
            </button>
            <button type="button" onClick={() => setShowForm(true)} className={dash.btnPrimary}>
              + New Batch
            </button>
          </div>
        ) : null}
      </div>

      <div className={dash.tableWrap}>
        <table className="w-full text-sm">
          <thead className={dash.thead}>
            <tr>
              <th className={dash.th}>Batch</th>
              <th className={dash.th}>Years</th>
              <th className={dash.th}>Students</th>
              <th className={dash.th}>Status</th>
              {canDeleteBatches ? <th className={dash.th}>Actions</th> : null}
            </tr>
          </thead>
          <tbody className={dash.tbodyDivide}>
            {loading ? (
              <tr>
                <td colSpan={canDeleteBatches ? 5 : 4} className={dash.emptyCell}>
                  Loading...
                </td>
              </tr>
            ) : batches.length === 0 ? (
              <tr>
                <td colSpan={canDeleteBatches ? 5 : 4} className={dash.emptyCell}>
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
                  {canDeleteBatches ? (
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
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {canManageBatches && showForm && (
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

      {canManageBatches && showImport && (
        <div className={dash.modalOverlay}>
          <div className={`${dash.modalPanel} max-w-lg`}>
            <h2 className={`${dash.sectionTitle} mb-4`}>Import batches</h2>
            <BulkImportOrderHint className="mb-3" />
            <p className={`mb-3 text-xs ${dash.cellMuted}`}>
              Columns: <strong>Name</strong> (optional — defaults to Start–End years), <strong>Start Year</strong>,{" "}
              <strong>End Year</strong>.
            </p>
            {importParseError && <div className={dash.errorBanner}>{importParseError}</div>}
            {importSubmitError && <div className={dash.errorBanner}>{importSubmitError}</div>}
            <input
              type="file"
              accept=".xlsx,.xls"
              className="mb-3 block w-full text-sm"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleExcelFile(f);
              }}
            />
            {importRows.length > 0 && (
              <p className={`mb-3 text-sm ${dash.cellMuted}`}>{importRows.length} row(s) ready to import.</p>
            )}
            <form onSubmit={handleBulkSubmit} className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowImport(false)} className={`flex-1 ${dash.btnSecondary}`}>
                Cancel
              </button>
              <button type="submit" disabled={importLoading || importRows.length === 0} className={`flex-1 ${dash.btnPrimary}`}>
                {importLoading ? "Importing…" : "Import"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
