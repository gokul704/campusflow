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

interface Department {
  id: string;
  name: string;
  code: string;
}

type DeptImportRow = { name: string; code: string };

function deptRowFromExcel(r: Record<string, unknown>): DeptImportRow | null {
  const name = excelCell(r, "name", "department name", "dept name");
  const code = excelCell(r, "code", "department code", "dept code").toUpperCase();
  if (!name && !code) return null;
  return { name, code };
}

export default function DepartmentsPage() {
  const [modules, setModules] = useState<ModulesMap | null>(null);
  const [depts, setDepts] = useState<Department[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [showImport, setShowImport] = useState(false);
  const [importRows, setImportRows] = useState<DeptImportRow[]>([]);
  const [importParseError, setImportParseError] = useState("");
  const [importSubmitError, setImportSubmitError] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const canManageDepartments = modules?.departments?.create === true;
  const canDeleteDepartments = modules?.departments?.delete === true;

  async function fetchDepts() {
    const res = await authFetch("/api/departments");
    const data = await res.json();
    setDepts(data);
  }

  useEffect(() => {
    authFetch("/api/auth/permissions")
      .then(async (r) => {
        const d = await r.json().catch(() => null);
        if (r.ok && d?.modules && typeof d.modules === "object") setModules(d.modules as ModulesMap);
        else setModules(null);
      })
      .catch(() => setModules(null));
    fetchDepts();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setDeleteError("");
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

  const [deleteError, setDeleteError] = useState("");

  async function handleDelete(id: string) {
    if (!confirm("Delete this department?")) return;
    setDeleteError("");
    try {
      const res = await authFetch(`/api/departments/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteError(formatApiError(data));
        return;
      }
      void fetchDepts();
    } catch {
      setDeleteError("Could not reach the server. Try again.");
    }
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
      const rows: DeptImportRow[] = [];
      for (const r of raw) {
        const parsed = deptRowFromExcel(r);
        if (!parsed) continue;
        if (!parsed.name || !parsed.code) {
          setImportParseError("Each row needs Name and Code.");
          return;
        }
        rows.push({ name: parsed.name, code: parsed.code });
      }
      if (rows.length === 0) {
        setImportParseError("No data rows found.");
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
      const res = await authFetch("/api/departments/bulk", {
        method: "POST",
        body: JSON.stringify({ rows: importRows }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setImportSubmitError(formatApiError(data));
        return;
      }
      setShowImport(false);
      void fetchDepts();
      alertBulkImportSummary(data.created ?? 0, data.failed ?? []);
    } catch {
      setImportSubmitError("Request failed");
    } finally {
      setImportLoading(false);
    }
  }

  return (
    <div>
      {deleteError && (
        <div className={`${dash.errorBanner} mb-4`} role="alert">
          {deleteError}
          <button
            type="button"
            className="ml-3 text-sm font-medium underline"
            onClick={() => setDeleteError("")}
          >
            Dismiss
          </button>
        </div>
      )}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className={dash.pageTitle}>Departments</h1>
        {canManageDepartments ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                downloadExcelTemplate("departments-import-template.xlsx", "Departments", ["Name", "Code"])
              }
              className={dash.btnSecondary}
            >
              Download Excel template
            </button>
            <button type="button" onClick={openImport} className={dash.btnSecondary}>
              Import Excel
            </button>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Create form */}
        {canManageDepartments ? (
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
        ) : null}

        {/* List */}
        <div className={`${dash.tableWrap} ${canManageDepartments ? "lg:col-span-2" : "lg:col-span-3"}`}>
          <table className="w-full text-sm">
            <thead className={dash.thead}>
              <tr>
                <th className={dash.th}>Name</th>
                <th className={dash.th}>Code</th>
                {canDeleteDepartments ? <th className={dash.th}>Actions</th> : null}
              </tr>
            </thead>
            <tbody className={dash.tbodyDivide}>
              {depts.length === 0 ? (
                <tr><td colSpan={canDeleteDepartments ? 3 : 2} className={dash.emptyCell}>No departments yet</td></tr>
              ) : depts.map((dept) => (
                <tr key={dept.id} className={dash.rowHover}>
                  <td className={`px-4 py-3 ${dash.cellStrong}`}>{dept.name}</td>
                  <td className="px-4 py-3">
                    <span className={`${dash.badge} font-mono`}>{dept.code}</span>
                  </td>
                  {canDeleteDepartments ? (
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleDelete(dept.id)}
                        className={dash.btnDanger}
                      >
                        Delete
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {canManageDepartments && showImport && (
        <div className={dash.modalOverlay}>
          <div className={`${dash.modalPanel} max-w-lg`}>
            <h2 className={`${dash.sectionTitle} mb-4`}>Import departments</h2>
            <BulkImportOrderHint className="mb-3" />
            <p className={`mb-3 text-xs ${dash.cellMuted}`}>
              Columns: <strong>Name</strong>, <strong>Code</strong> (one department per row).
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
