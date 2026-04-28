"use client";

import { useEffect, useState } from "react";
import { authFetch, formatApiError } from "@/lib/api";
import {
  alertBulkImportSummary,
  downloadExcelTemplate,
  excelCell,
  normalizeCourseCode,
  parseYesNoCell,
  readExcelFirstSheet,
} from "@/lib/excelImport";
import { BulkImportOrderHint } from "@/components/dashboard/BulkImportGuide";
import { dash } from "@/lib/dashboardUi";

type PermCell = { view: boolean; create: boolean; edit: boolean; delete: boolean };
type ModulesMap = Record<string, PermCell>;

interface Course {
  id: string;
  name: string;
  code: string;
  credits: number;
  department: { name: string; code: string } | null;
  _count?: { batchCourses?: number };
}

interface Department { id: string; name: string; code: string; }

type CourseImportRow = {
  name: string;
  code: string;
  credits: number;
  isCommon?: boolean;
  departmentId?: string;
  departmentCode?: string;
  departmentName?: string;
};

function courseRowFromExcel(r: Record<string, unknown>): CourseImportRow | null {
  const name = excelCell(r, "name", "course name", "subject", "paper", "paper title", "title");
  const codeRaw = excelCell(
    r,
    "code",
    "course code",
    "subjectcode",
    "subject code",
    "papercode",
    "paper code",
    "scode",
    "s code"
  );
  const code = normalizeCourseCode(codeRaw);
  if (!name && !code) return null;
  const creditsRaw = excelCell(r, "credits", "credit");
  const creditsN = Number(creditsRaw);
  const credits = Number.isFinite(creditsN) && creditsRaw !== "" ? creditsN : 3;
  const isCommon = parseYesNoCell(excelCell(r, "iscommon", "common", "shared"));
  return {
    name,
    code,
    credits,
    isCommon,
    departmentId: excelCell(r, "departmentid", "department id") || undefined,
    departmentCode: excelCell(r, "departmentcode", "department code", "dept code") || undefined,
    departmentName: excelCell(r, "departmentname", "department name", "dept name") || undefined,
  };
}

export default function CoursesPage() {
  const [modules, setModules] = useState<ModulesMap | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filterDept, setFilterDept] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", departmentId: "", credits: "3" });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const [showImport, setShowImport] = useState(false);
  const [importRows, setImportRows] = useState<CourseImportRow[]>([]);
  const [importParseError, setImportParseError] = useState("");
  const [importSubmitError, setImportSubmitError] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const canManageCourses = modules?.courses?.create === true;
  const canDeleteCourses = modules?.courses?.delete === true;

  async function fetchCourses() {
    setLoading(true);
    const p = new URLSearchParams();
    if (filterDept) p.set("departmentId", filterDept);
    const res = await authFetch(`/api/courses?${p}`);
    setCourses(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    authFetch("/api/auth/permissions")
      .then(async (r) => {
        const d = await r.json().catch(() => null);
        if (r.ok && d?.modules && typeof d.modules === "object") setModules(d.modules as ModulesMap);
        else setModules(null);
      })
      .catch(() => setModules(null));
    authFetch("/api/departments").then(r => r.json()).then(setDepartments);
  }, []);

  useEffect(() => { fetchCourses(); }, [filterDept]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);
    try {
      const res = await authFetch("/api/courses", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          code: form.code.trim(),
          departmentId: form.departmentId || undefined,
          credits: Number(form.credits),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? "Failed"); return; }
      setShowForm(false);
      setForm({ name: "", code: "", departmentId: "", credits: "3" });
      fetchCourses();
    } catch { setFormError("Something went wrong"); }
    finally { setFormLoading(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this course?")) return;
    const res = await authFetch(`/api/courses/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    fetchCourses();
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
      const rows: CourseImportRow[] = [];
      for (const row of raw) {
        const parsed = courseRowFromExcel(row);
        if (!parsed) continue;
        if (!parsed.name || !parsed.code) {
          setImportParseError('Each row needs a Subject (or "Name") and a paper Code (e.g. S. code / "B 4.1").');
          return;
        }
        const common = parsed.isCommon === true;
        if (!common && !parsed.departmentId && !parsed.departmentCode && !parsed.departmentName) {
          setImportParseError(
            `For "${parsed.code}": add Department Code or Name, or set Is Common to Y (shared course).`
          );
          return;
        }
        rows.push(parsed);
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
      const res = await authFetch("/api/courses/bulk", {
        method: "POST",
        body: JSON.stringify({
          rows: importRows.map((r) => ({
            name: r.name.trim(),
            code: r.code.trim(),
            credits: r.credits,
            isCommon: r.isCommon ?? false,
            departmentId: r.departmentId?.trim() || null,
            departmentCode: r.departmentCode?.trim() || null,
            departmentName: r.departmentName?.trim() || null,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setImportSubmitError(formatApiError(data));
        return;
      }
      setShowImport(false);
      void fetchCourses();
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
        <h1 className={dash.pageTitle}>Courses</h1>
        {canManageCourses ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                downloadExcelTemplate("courses-import-template.xlsx", "Courses", [
                  "S. code / Paper code",
                  "Subject",
                  "Credits",
                  "Department Code",
                  "Is Common (Y/N)",
                ])
              }
              className={dash.btnSecondary}
            >
              Download Excel template
            </button>
            <button type="button" onClick={openImport} className={dash.btnSecondary}>
              Import Excel
            </button>
            <button type="button" onClick={() => setShowForm(true)} className={dash.btnPrimary}>
              + Add Course
            </button>
          </div>
        ) : null}
      </div>

      <div className="mb-4">
        <select
          value={filterDept}
          onChange={e => { setFilterDept(e.target.value); }}
          className={dash.select}
        >
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      <div className={dash.tableWrap}>
        <table className="w-full text-sm">
          <thead className={dash.thead}>
            <tr>
              <th className={dash.th}>Code</th>
              <th className={dash.th}>Name</th>
              <th className={dash.th}>Department</th>
              <th className={dash.th}>Credits</th>
              <th className={dash.th}>Batch links</th>
              {canDeleteCourses ? <th className={dash.th}>Actions</th> : null}
            </tr>
          </thead>
          <tbody className={dash.tbodyDivide}>
            {loading ? (
              <tr><td colSpan={canDeleteCourses ? 6 : 5} className={dash.emptyCell}>Loading...</td></tr>
            ) : courses.length === 0 ? (
              <tr><td colSpan={canDeleteCourses ? 6 : 5} className={dash.emptyCell}>No courses yet</td></tr>
            ) : courses.map((c) => (
              <tr key={c.id} className={dash.rowHover}>
                <td className={`px-4 py-3 ${dash.cellMono}`}>{c.code}</td>
                <td className={`px-4 py-3 ${dash.cellStrong}`}>{c.name}</td>
                <td className={`px-4 py-3 ${dash.cellMuted}`}>{c.department?.name ?? "—"}</td>
                <td className={`px-4 py-3 ${dash.cellMuted}`}>{c.credits}</td>
                <td className={`px-4 py-3 ${dash.cellMuted}`}>{c._count?.batchCourses ?? 0}</td>
                {canDeleteCourses ? (
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => handleDelete(c.id)} className={dash.btnDanger}>Delete</button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canManageCourses && showForm && (
        <div className={dash.modalOverlay}>
          <div className={`${dash.modalPanel} max-w-md`}>
            <h2 className={`${dash.sectionTitle} mb-4`}>Add Course</h2>
            {formError && <div className={dash.errorBanner}>{formError}</div>}
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className={dash.label}>Course Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Data Structures"
                  className={dash.input} />
              </div>
              <div>
                <label className={dash.label}>Code</label>
                <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} required placeholder="CS201"
                  className={dash.input} />
              </div>
              <div>
                <label className={dash.label}>Department</label>
                <select value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))} required
                  className={dash.selectFull}>
                  <option value="">Select department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className={dash.label}>Credits</label>
                <input type="number" min={0} max={10} value={form.credits} onChange={e => setForm(f => ({ ...f, credits: e.target.value }))} required
                  className={dash.input} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className={`flex-1 ${dash.btnSecondary}`}>Cancel</button>
                <button type="submit" disabled={formLoading} className={`flex-1 ${dash.btnPrimary}`}>
                  {formLoading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {canManageCourses && showImport && (
        <div className={dash.modalOverlay}>
          <div className={`${dash.modalPanel} max-w-lg`}>
            <h2 className={`${dash.sectionTitle} mb-4`}>Import courses</h2>
            <BulkImportOrderHint className="mb-3" />
            <p className={`mb-3 text-xs ${dash.cellMuted}`}>
              Prospectus-style tables map easily: <strong>Subject</strong> → course name, <strong>S. code / Paper code</strong> → code
              (spaces removed, e.g. <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">B 4.1</code> becomes{" "}
              <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">B4.1</code>). Credits default to <strong>3</strong> if left blank.
              Use <strong>Department Code</strong> or set <strong>Is Common</strong> to Y for shared papers.
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
