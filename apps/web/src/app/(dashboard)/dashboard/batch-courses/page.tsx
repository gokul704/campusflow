"use client";

import { useEffect, useState } from "react";
import { authFetch, formatApiError } from "@/lib/api";
import {
  alertBulkImportSummary,
  downloadExcelTemplate,
  excelCell,
  normalizeCourseCode,
  readExcelFirstSheet,
} from "@/lib/excelImport";
import { BulkImportOrderHint } from "@/components/dashboard/BulkImportGuide";
import { dash } from "@/lib/dashboardUi";

type PermCell = { view: boolean; create: boolean; edit: boolean; delete: boolean };
type ModulesMap = Record<string, PermCell>;

interface BatchCourse {
  id: string;
  semester: number;
  batch?: { name: string };
  course?: { name: string; code: string };
  faculty?: { user?: { firstName: string; lastName: string } | null } | null;
}

interface BatchItem { id: string; name: string; }
interface CourseItem { id: string; name: string; code: string; }
interface FacultyItem { id: string; user: { firstName: string; lastName: string }; }

type BatchCourseImportRow = {
  batchId?: string;
  batchName?: string;
  courseCode?: string;
  courseId?: string;
  semester: number;
  facultyEmail?: string;
  facultyId?: string;
};

function batchCourseRowFromExcel(r: Record<string, unknown>): BatchCourseImportRow | null {
  const batchId = excelCell(r, "batchid", "batch id", "batch_id");
  const batchName = excelCell(r, "batchname", "batch name", "batch") || undefined;
  const courseCodeRaw = excelCell(
    r,
    "coursecode",
    "course code",
    "subjectcode",
    "subject code",
    "papercode",
    "paper code",
    "scode",
    "s code",
    "code"
  );
  const courseCode = courseCodeRaw ? normalizeCourseCode(courseCodeRaw) : undefined;
  const courseId = excelCell(r, "courseid", "course id", "course_id") || undefined;
  const semester = Number(excelCell(r, "semester", "sem"));
  const facultyEmail = excelCell(r, "facultyemail", "faculty email", "teacher email") || undefined;
  const facultyId = excelCell(r, "facultyid", "faculty id") || undefined;
  if (!batchId && !batchName && !courseCode && !courseId) return null;
  return {
    batchId: batchId || undefined,
    batchName,
    courseCode,
    courseId,
    semester,
    facultyEmail,
    facultyId: facultyId || undefined,
  };
}

export default function BatchCoursesPage() {
  const [modules, setModules] = useState<ModulesMap | null>(null);
  const [batchCourses, setBatchCourses] = useState<BatchCourse[]>([]);
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [faculty, setFaculty] = useState<FacultyItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterBatchId, setFilterBatchId] = useState("");
  const [filterSemester, setFilterSemester] = useState("");

  // Form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ batchId: "", courseId: "", semester: "1", facultyId: "" });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const [showImport, setShowImport] = useState(false);
  const [importRows, setImportRows] = useState<BatchCourseImportRow[]>([]);
  const [importParseError, setImportParseError] = useState("");
  const [importSubmitError, setImportSubmitError] = useState("");
  const [importLoading, setImportLoading] = useState(false);

  const canCreateBatchCourse = modules?.batchCourses?.create === true;
  const canDeleteBatchCourse = modules?.batchCourses?.delete === true;

  useEffect(() => {
    authFetch("/api/auth/permissions")
      .then(async (r) => {
        const d = await r.json().catch(() => null);
        if (r.ok && d?.modules && typeof d.modules === "object") setModules(d.modules as ModulesMap);
        else setModules(null);
      })
      .catch(() => setModules(null));
  }, []);

  async function fetchBatchCourses() {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (filterBatchId) p.set("batchId", filterBatchId);
      if (filterSemester) p.set("semester", filterSemester);
      const res = await authFetch(`/api/batch-courses?${p}`);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        setBatchCourses([]);
        return;
      }
      const rows = Array.isArray(data) ? data : (data as { batchCourses?: BatchCourse[] }).batchCourses ?? [];
      setBatchCourses(Array.isArray(rows) ? rows : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    authFetch("/api/batches").then(r => r.json()).then(d => setBatches(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => {
    if (!canCreateBatchCourse) {
      setCourses([]);
      setFaculty([]);
      return;
    }
    authFetch("/api/courses").then(r => r.json()).then(d => setCourses(Array.isArray(d) ? d : d.courses ?? []));
    authFetch("/api/faculty").then(r => r.json()).then(d => setFaculty(Array.isArray(d) ? d : d.faculty ?? []));
  }, [canCreateBatchCourse]);

  useEffect(() => { fetchBatchCourses(); }, [filterBatchId, filterSemester]);

  async function openForm() {
    setForm({ batchId: "", courseId: "", semester: "1", facultyId: "" });
    setFormError("");
    setShowForm(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);
    try {
      const body: Record<string, unknown> = {
        batchId: form.batchId,
        courseId: form.courseId,
        semester: Number(form.semester),
      };
      if (form.facultyId) body.facultyId = form.facultyId;
      const res = await authFetch("/api/batch-courses", { method: "POST", body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? "Failed to assign course"); return; }
      setShowForm(false);
      fetchBatchCourses();
    } catch { setFormError("Something went wrong"); }
    finally { setFormLoading(false); }
  }

  async function handleDelete(bc: BatchCourse) {
    if (!confirm(`Remove "${bc.course?.name ?? "course"}" from batch "${bc.batch?.name ?? "batch"}"?`)) return;
    const res = await authFetch(`/api/batch-courses/${bc.id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); alert(d.error ?? "Failed to delete"); return; }
    fetchBatchCourses();
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
      const rows: BatchCourseImportRow[] = [];
      for (const row of raw) {
        const parsed = batchCourseRowFromExcel(row);
        if (!parsed) continue;
        const byId = parsed.batchId;
        const byName = parsed.batchName;
        const courseOk = parsed.courseCode || parsed.courseId;
        if (!courseOk || !Number.isFinite(parsed.semester)) {
          setImportParseError("Each row needs Course Code or Course ID, Semester, and Batch (by ID or name).");
          return;
        }
        if (!byId && !byName) {
          setImportParseError("Each row needs Batch ID or Batch Name.");
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
      const res = await authFetch("/api/batch-courses/bulk", {
        method: "POST",
        body: JSON.stringify({
          rows: importRows.map((r) => ({
            batchId: r.batchId || null,
            batchName: r.batchName || null,
            courseCode: r.courseCode || null,
            courseId: r.courseId || null,
            semester: r.semester,
            facultyEmail: r.facultyEmail || null,
            facultyId: r.facultyId || null,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setImportSubmitError(formatApiError(data));
        return;
      }
      setShowImport(false);
      void fetchBatchCourses();
      alertBulkImportSummary(data.created ?? 0, data.failed ?? []);
    } catch {
      setImportSubmitError("Request failed");
    } finally {
      setImportLoading(false);
    }
  }

  const showBatchCourseAdmin = canCreateBatchCourse;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className={dash.pageTitle}>{showBatchCourseAdmin ? "Batch Courses" : "My courses"}</h1>
          {!showBatchCourseAdmin && (
            <p className={`mt-1 max-w-xl text-xs ${dash.cellMuted}`}>
              Batch and paper assignments where you are the assigned faculty. Contact academics office to change allocations.
            </p>
          )}
        </div>
        {showBatchCourseAdmin && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                downloadExcelTemplate("batch-courses-import-template.xlsx", "BatchCourses", [
                  "Batch Name",
                  "S. code / Course code",
                  "Semester",
                  "Faculty Email",
                ])
              }
              className={dash.btnSecondary}
            >
              Download Excel template
            </button>
            <button type="button" onClick={openImport} className={dash.btnSecondary}>
              Import Excel
            </button>
            <button type="button" onClick={openForm} className={dash.btnPrimary}>
              + Assign Course
            </button>
          </div>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={filterBatchId}
          onChange={e => { setFilterBatchId(e.target.value); }}
          className={dash.select}
        >
          <option value="">All Batches</option>
          {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select
          value={filterSemester}
          onChange={e => setFilterSemester(e.target.value)}
          className={dash.select}
        >
          <option value="">All Semesters</option>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={String(s)}>Semester {s}</option>)}
        </select>
      </div>

      <div className={dash.tableWrap}>
        <table className="w-full text-sm">
          <thead className={dash.thead}>
            <tr>
              <th className={dash.th}>Batch</th>
              <th className={dash.th}>Course Code</th>
              <th className={dash.th}>Course Name</th>
              <th className={dash.th}>Semester</th>
              <th className={dash.th}>Faculty</th>
              {canDeleteBatchCourse ? <th className={dash.th}>Actions</th> : null}
            </tr>
          </thead>
          <tbody className={dash.tbodyDivide}>
            {loading ? (
              <tr><td colSpan={canDeleteBatchCourse ? 6 : 5} className={dash.emptyCell}>Loading...</td></tr>
            ) : batchCourses.length === 0 ? (
              <tr><td colSpan={canDeleteBatchCourse ? 6 : 5} className={dash.emptyCell}>No batch courses found</td></tr>
            ) : batchCourses.map(bc => (
              <tr key={bc.id} className={dash.rowHover}>
                <td className={`px-4 py-3 ${dash.cellStrong}`}>{bc.batch?.name ?? "—"}</td>
                <td className={`px-4 py-3 ${dash.cellMono}`}>{bc.course?.code ?? "—"}</td>
                <td className={`px-4 py-3 ${dash.cellStrong}`}>{bc.course?.name ?? "—"}</td>
                <td className={`px-4 py-3 ${dash.cellMuted}`}>Semester {bc.semester}</td>
                <td className={`px-4 py-3 ${dash.cellMuted}`}>
                  {bc.faculty?.user
                    ? `${bc.faculty.user.firstName} ${bc.faculty.user.lastName}`
                    : <span className={dash.emDash}>&mdash;</span>}
                </td>
                {canDeleteBatchCourse ? (
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => handleDelete(bc)} className={dash.btnDanger}>
                      Delete
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showBatchCourseAdmin && showForm && (
        <div className={dash.modalOverlay}>
          <div className={`${dash.modalPanel} max-h-[90vh] max-w-lg overflow-y-auto`}>
            <h2 className={`${dash.sectionTitle} mb-4`}>Assign Course to Batch</h2>
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
                <label className={dash.label}>Course</label>
                <select
                  value={form.courseId}
                  onChange={e => setForm(f => ({ ...f, courseId: e.target.value }))}
                  required
                  className={dash.selectFull}
                >
                  <option value="">Select course</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className={dash.label}>Semester</label>
                <select
                  value={form.semester}
                  onChange={e => setForm(f => ({ ...f, semester: e.target.value }))}
                  required
                  className={dash.selectFull}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={String(s)}>Semester {s}</option>)}
                </select>
              </div>
              <div>
                <label className={dash.label}>Faculty (optional)</label>
                <select
                  value={form.facultyId}
                  onChange={e => setForm(f => ({ ...f, facultyId: e.target.value }))}
                  className={dash.selectFull}
                >
                  <option value="">No faculty assigned</option>
                  {faculty.map(f => (
                    <option key={f.id} value={f.id}>{f.user.firstName} {f.user.lastName}</option>
                  ))}
                </select>
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
                  {formLoading ? "Saving..." : "Assign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBatchCourseAdmin && showImport && (
        <div className={dash.modalOverlay}>
          <div className={`${dash.modalPanel} max-h-[90vh] max-w-lg overflow-y-auto`}>
            <h2 className={`${dash.sectionTitle} mb-4`}>Import batch courses</h2>
            <BulkImportOrderHint className="mb-3" />
            <p className={`mb-3 text-xs ${dash.cellMuted}`}>
              Use <strong>Batch Name</strong> as shown under Batches (or Batch ID).{" "}
              <strong>S. code / Course code</strong> accepts M.Sc(Aud)-style codes (e.g. <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">Aud 201M</code> → matches{" "}
              <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">AUD201M</code> in Courses). <strong>Faculty Email</strong> is optional.
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
