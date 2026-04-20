"use client";

import { useEffect, useState } from "react";
import { authFetch, formatApiError } from "@/lib/api";
import {
  alertBulkImportSummary,
  downloadExcelTemplate,
  excelCell,
  excelDateToYmd,
  normHeader,
  readExcelFirstSheet,
} from "@/lib/excelImport";
import { BulkImportOrderHint } from "@/components/dashboard/BulkImportGuide";
import { dash } from "@/lib/dashboardUi";

interface AttendanceRecord {
  id: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  student: { user: { firstName: string; lastName: string; email: string }; rollNumber?: string };
  batchCourse: { course: { name: string; code: string } };
}

interface BatchCourseOption {
  id: string;
  semester: number;
  batch: { id: string; name: string };
  course: { name: string; code: string };
  section?: { name: string };
}

interface Student {
  id: string;
  rollNumber: string;
  user: { firstName: string; lastName: string };
}

interface AttendanceSummary {
  studentId: string;
  studentName: string;
  rollNumber: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  percentage: number;
}

type StudentStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

const STATUS_COLORS: Record<StudentStatus, string> = {
  PRESENT: "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300",
  ABSENT: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300",
  LATE: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300",
  EXCUSED: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
};

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function rawCell(row: Record<string, unknown>, ...aliases: string[]): unknown {
  const targets = aliases.map((a) => normHeader(a));
  for (const [k, v] of Object.entries(row)) {
    if (targets.includes(normHeader(String(k)))) return v;
  }
  return undefined;
}

type AttendanceImportRow = {
  batchCourseId?: string;
  batchName?: string;
  sectionName?: string;
  courseCode?: string;
  courseId?: string;
  semester?: number;
  date: string;
  rollNumber?: string;
  studentEmail?: string;
  status: string;
};

function attendanceRowFromExcel(r: Record<string, unknown>): AttendanceImportRow | null {
  const batchCourseId = excelCell(r, "batchcourseid", "batch course id", "batch_course_id");
  const batchName = excelCell(r, "batchname", "batch name", "batch") || undefined;
  const sectionName = excelCell(r, "sectionname", "section name", "section", "sec") || undefined;
  const courseCode = excelCell(r, "coursecode", "course code", "code") || undefined;
  const courseId = excelCell(r, "courseid", "course id") || undefined;
  const semRaw = excelCell(r, "semester", "sem");
  const semester = semRaw ? Number(semRaw) : undefined;
  const date = excelDateToYmd(rawCell(r, "date", "attendance date") ?? excelCell(r, "date", "attendance date"));
  const rollNumber = excelCell(r, "rollnumber", "roll", "roll no", "roll_number") || undefined;
  const studentEmail = excelCell(r, "studentemail", "email", "student email") || undefined;
  const status = excelCell(r, "status");
  if (!batchCourseId && !batchName && !courseCode && !courseId) return null;
  return {
    batchCourseId: batchCourseId || undefined,
    batchName,
    sectionName,
    courseCode,
    courseId,
    semester: semester != null && Number.isFinite(semester) ? semester : undefined,
    date,
    rollNumber,
    studentEmail,
    status,
  };
}

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState<"mark" | "view">("mark");
  const [batchCourses, setBatchCourses] = useState<BatchCourseOption[]>([]);

  // Mark Attendance state
  const [markBatchCourseId, setMarkBatchCourseId] = useState("");
  const [markDate, setMarkDate] = useState(today());
  const [students, setStudents] = useState<Student[]>([]);
  const [studentStatuses, setStudentStatuses] = useState<Record<string, StudentStatus>>({});
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Attendance summary
  const [summary, setSummary] = useState<AttendanceSummary[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // View Records state
  const [viewBatchCourseId, setViewBatchCourseId] = useState("");
  const [viewStartDate, setViewStartDate] = useState("");
  const [viewEndDate, setViewEndDate] = useState("");
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  const [showImport, setShowImport] = useState(false);
  const [importRows, setImportRows] = useState<AttendanceImportRow[]>([]);
  const [importParseError, setImportParseError] = useState("");
  const [importSubmitError, setImportSubmitError] = useState("");
  const [importLoading, setImportLoading] = useState(false);

  useEffect(() => {
    authFetch("/api/batch-courses")
      .then(r => r.json())
      .then(d => setBatchCourses(Array.isArray(d) ? d : d.batchCourses ?? []));
  }, []);

  async function loadStudents() {
    if (!markBatchCourseId) return;
    setLoadingStudents(true);
    setSaveSuccess(false);
    setSaveError("");
    const bc = batchCourses.find(b => b.id === markBatchCourseId);
    if (!bc) { setLoadingStudents(false); return; }
    const res = await authFetch(`/api/students?batchId=${bc.batch.id}&limit=200`);
    const data = await res.json();
    const list: Student[] = data.students ?? data ?? [];
    setStudents(list);
    const initial: Record<string, StudentStatus> = {};
    list.forEach(s => { initial[s.id] = "PRESENT"; });
    setStudentStatuses(initial);
    setLoadingStudents(false);

    // Load summary
    setLoadingSummary(true);
    const sRes = await authFetch(`/api/attendance/summary/${markBatchCourseId}`);
    if (sRes.ok) {
      const sData = await sRes.json();
      setSummary(Array.isArray(sData) ? sData : sData.summary ?? []);
    }
    setLoadingSummary(false);
  }

  async function saveAttendance() {
    if (!markBatchCourseId || students.length === 0) return;
    setSavingAttendance(true);
    setSaveError("");
    setSaveSuccess(false);
    try {
      const records = students.map(s => ({ studentId: s.id, status: studentStatuses[s.id] ?? "PRESENT" }));
      const res = await authFetch("/api/attendance", {
        method: "POST",
        body: JSON.stringify({ batchCourseId: markBatchCourseId, date: markDate, records }),
      });
      const data = await res.json();
      if (!res.ok) { setSaveError(data.error ?? "Failed to save attendance"); return; }
      setSaveSuccess(true);
    } catch { setSaveError("Something went wrong"); }
    finally { setSavingAttendance(false); }
  }

  async function fetchRecords() {
    if (!viewBatchCourseId) return;
    setLoadingRecords(true);
    const p = new URLSearchParams({ batchCourseId: viewBatchCourseId });
    if (viewStartDate) p.set("startDate", viewStartDate);
    if (viewEndDate) p.set("endDate", viewEndDate);
    const res = await authFetch(`/api/attendance?${p}`);
    const data = await res.json();
    setRecords(Array.isArray(data) ? data : data.records ?? []);
    setLoadingRecords(false);
  }

  useEffect(() => {
    if (activeTab === "view" && viewBatchCourseId) {
      fetchRecords();
    }
  }, [activeTab, viewBatchCourseId, viewStartDate, viewEndDate]);

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
      const rows: AttendanceImportRow[] = [];
      for (const row of raw) {
        const parsed = attendanceRowFromExcel(row);
        if (!parsed) continue;
        const byBc = !!parsed.batchCourseId;
        const byParts =
          parsed.batchName &&
          parsed.sectionName &&
          (parsed.courseCode || parsed.courseId) &&
          parsed.semester != null;
        if (!byBc && !byParts) {
          setImportParseError(
            "Each row needs Batch Course ID, or (Batch Name + Section Name + Course Code + Semester)."
          );
          return;
        }
        if (!parsed.date) {
          setImportParseError("Each row needs a Date (YYYY-MM-DD).");
          return;
        }
        if (!parsed.rollNumber && !parsed.studentEmail) {
          setImportParseError("Each row needs Roll Number or Student Email.");
          return;
        }
        if (!parsed.status) {
          setImportParseError("Each row needs Status (PRESENT, ABSENT, LATE, EXCUSED).");
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
      const res = await authFetch("/api/attendance/bulk", {
        method: "POST",
        body: JSON.stringify({
          rows: importRows.map((r) => ({
            batchCourseId: r.batchCourseId || null,
            batchName: r.batchName || null,
            sectionName: r.sectionName || null,
            courseCode: r.courseCode || null,
            courseId: r.courseId || null,
            semester: r.semester ?? null,
            date: r.date,
            rollNumber: r.rollNumber || null,
            studentEmail: r.studentEmail || null,
            status: r.status.trim().toUpperCase(),
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setImportSubmitError(formatApiError(data));
        return;
      }
      setShowImport(false);
      if (markBatchCourseId) void loadStudents();
      if (viewBatchCourseId) void fetchRecords();
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
        <h1 className={dash.pageTitle}>Attendance</h1>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              downloadExcelTemplate("attendance-import-template.xlsx", "Attendance", [
                "Batch Name",
                "Section Name",
                "Course Code",
                "Semester",
                "Date",
                "Roll Number",
                "Student Email",
                "Status",
              ])
            }
            className={dash.btnSecondary}
          >
            Download Excel template
          </button>
          <button type="button" onClick={openImport} className={dash.btnSecondary}>
            Import Excel
          </button>
        </div>
      </div>

      <div className="mb-6 flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("mark")}
          className={activeTab === "mark" ? dash.tabActive : dash.tabInactive}
        >
          Mark Attendance
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("view")}
          className={activeTab === "view" ? dash.tabActive : dash.tabInactive}
        >
          View Records
        </button>
      </div>

      {activeTab === "mark" && (
        <div className="space-y-6">
          <div className={`${dash.card} ${dash.cardToolbar}`}>
            <div>
              <label className={dash.labelSmall}>Batch Course</label>
              <select
                value={markBatchCourseId}
                onChange={e => { setMarkBatchCourseId(e.target.value); setStudents([]); setStudentStatuses({}); setSummary([]); }}
                className={`${dash.select} ${dash.selectMin}`}
              >
                <option value="">Select batch course</option>
                {batchCourses.map(bc => (
                  <option key={bc.id} value={bc.id}>
                    {bc.batch.name}{bc.section ? ` / ${bc.section.name}` : ""} — {bc.course.name} (Sem {bc.semester})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={dash.labelSmall}>Date</label>
              <input
                type="date"
                value={markDate}
                onChange={e => setMarkDate(e.target.value)}
                className={dash.select}
              />
            </div>
            <button
              type="button"
              onClick={loadStudents}
              disabled={!markBatchCourseId || loadingStudents}
              className={dash.btnPrimary}
            >
              {loadingStudents ? "Loading..." : "Load Students"}
            </button>
          </div>

          {students.length > 0 && (
            <div className={dash.tableWrap}>
              <div className={dash.tableHeaderBar}>
                <span className={`text-sm font-medium text-gray-700 dark:text-gray-200`}>{students.length} students</span>
                <div className="flex gap-2">
                  {(["PRESENT", "ABSENT", "LATE", "EXCUSED"] as StudentStatus[]).map(s => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => {
                        const all: Record<string, StudentStatus> = {};
                        students.forEach(st => { all[st.id] = s; });
                        setStudentStatuses(all);
                      }}
                      className={dash.chipBtn}
                    >
                      All {s}
                    </button>
                  ))}
                </div>
              </div>
              <table className="w-full text-sm">
                <thead className={dash.thead}>
                  <tr>
                    <th className={dash.th}>Roll No</th>
                    <th className={dash.th}>Name</th>
                    <th className={dash.th}>Status</th>
                  </tr>
                </thead>
                <tbody className={dash.tbodyDivide}>
                  {students.map(s => (
                    <tr key={s.id} className={dash.rowHover}>
                      <td className={`px-4 py-3 ${dash.cellMono}`}>{s.rollNumber}</td>
                      <td className={`px-4 py-3 ${dash.cellStrong}`}>{s.user.firstName} {s.user.lastName}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {(["PRESENT", "ABSENT", "LATE", "EXCUSED"] as StudentStatus[]).map(status => (
                            <label key={status} className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="radio"
                                name={`status-${s.id}`}
                                value={status}
                                checked={studentStatuses[s.id] === status}
                                onChange={() => setStudentStatuses(prev => ({ ...prev, [s.id]: status }))}
                                className="accent-blue-600"
                              />
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[status]}`}>{status}</span>
                            </label>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className={dash.tableFooterBar}>
                {saveError && <span className="text-sm text-red-600 dark:text-red-400">{saveError}</span>}
                {saveSuccess && <span className="text-sm text-green-600 dark:text-green-400">Attendance saved successfully!</span>}
                <button
                  type="button"
                  onClick={saveAttendance}
                  disabled={savingAttendance}
                  className={`ml-auto ${dash.btnPrimary}`}
                >
                  {savingAttendance ? "Saving..." : "Save Attendance"}
                </button>
              </div>
            </div>
          )}

          {markBatchCourseId && (
            <div>
              <h2 className={`${dash.sectionTitle} mb-3`}>Attendance Summary</h2>
              <div className={dash.tableWrap}>
                <table className="w-full text-sm">
                  <thead className={dash.thead}>
                    <tr>
                      <th className={dash.th}>Student</th>
                      <th className={dash.th}>Roll No</th>
                      <th className={dash.th}>Present</th>
                      <th className={dash.th}>Absent</th>
                      <th className={dash.th}>Late</th>
                      <th className={dash.th}>Excused</th>
                      <th className={dash.th}>Total</th>
                      <th className={dash.th}>%</th>
                    </tr>
                  </thead>
                  <tbody className={dash.tbodyDivide}>
                    {loadingSummary ? (
                      <tr><td colSpan={8} className={dash.emptyCell}>Loading summary...</td></tr>
                    ) : summary.length === 0 ? (
                      <tr><td colSpan={8} className={dash.emptyCell}>No attendance data yet</td></tr>
                    ) : summary.map(row => (
                      <tr key={row.studentId} className={dash.rowHover}>
                        <td className={`px-4 py-3 ${dash.cellStrong}`}>{row.studentName}</td>
                        <td className={`px-4 py-3 ${dash.cellMono}`}>{row.rollNumber}</td>
                        <td className="px-4 py-3 text-green-600 dark:text-green-400">{row.present}</td>
                        <td className="px-4 py-3 text-red-600 dark:text-red-400">{row.absent}</td>
                        <td className="px-4 py-3 text-yellow-600 dark:text-yellow-400">{row.late}</td>
                        <td className="px-4 py-3 text-blue-600 dark:text-blue-400">{row.excused}</td>
                        <td className={`px-4 py-3 ${dash.cellMuted}`}>{row.total}</td>
                        <td className="px-4 py-3">
                          <span className={`font-medium ${row.percentage >= 75 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                            {row.percentage.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "view" && (
        <div className="space-y-4">
          <div className={`${dash.card} ${dash.cardToolbar}`}>
            <div>
              <label className={dash.labelSmall}>Batch Course</label>
              <select
                value={viewBatchCourseId}
                onChange={e => setViewBatchCourseId(e.target.value)}
                className={`${dash.select} ${dash.selectMin}`}
              >
                <option value="">Select batch course</option>
                {batchCourses.map(bc => (
                  <option key={bc.id} value={bc.id}>
                    {bc.batch.name}{bc.section ? ` / ${bc.section.name}` : ""} — {bc.course.name} (Sem {bc.semester})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={dash.labelSmall}>From</label>
              <input
                type="date"
                value={viewStartDate}
                onChange={e => setViewStartDate(e.target.value)}
                className={dash.select}
              />
            </div>
            <div>
              <label className={dash.labelSmall}>To</label>
              <input
                type="date"
                value={viewEndDate}
                onChange={e => setViewEndDate(e.target.value)}
                className={dash.select}
              />
            </div>
            <button
              type="button"
              onClick={fetchRecords}
              disabled={!viewBatchCourseId}
              className={dash.btnPrimary}
            >
              Search
            </button>
          </div>

          <div className={dash.tableWrap}>
            <table className="w-full text-sm">
              <thead className={dash.thead}>
                <tr>
                  <th className={dash.th}>Date</th>
                  <th className={dash.th}>Student</th>
                  <th className={dash.th}>Roll No</th>
                  <th className={dash.th}>Status</th>
                </tr>
              </thead>
              <tbody className={dash.tbodyDivide}>
                {loadingRecords ? (
                  <tr><td colSpan={4} className={dash.emptyCell}>Loading...</td></tr>
                ) : records.length === 0 ? (
                  <tr><td colSpan={4} className={dash.emptyCell}>
                    {viewBatchCourseId ? "No records found" : "Select a batch course to view records"}
                  </td></tr>
                ) : records.map(r => (
                  <tr key={r.id} className={dash.rowHover}>
                    <td className={`px-4 py-3 ${dash.cellMuted}`}>{new Date(r.date).toLocaleDateString()}</td>
                    <td className={`px-4 py-3 ${dash.cellStrong}`}>
                      {r.student.user.firstName} {r.student.user.lastName}
                    </td>
                    <td className={`px-4 py-3 ${dash.cellMono}`}>{r.student.rollNumber ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[r.status]}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showImport && (
        <div className={dash.modalOverlay}>
          <div className={`${dash.modalPanel} max-h-[90vh] max-w-lg overflow-y-auto`}>
            <h2 className={`${dash.sectionTitle} mb-4`}>Import attendance</h2>
            <BulkImportOrderHint className="mb-3" />
            <p className={`mb-3 text-xs ${dash.cellMuted}`}>
              Provide either <strong>Roll Number</strong> or <strong>Student Email</strong> per row. Status must be one of: PRESENT,
              ABSENT, LATE, EXCUSED. Rows update existing marks for the same student, course, and date.
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
