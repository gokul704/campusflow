"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/api";
import { dash } from "@/lib/dashboardUi";

interface AttendanceReportRow {
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

interface FeeReportData {
  totalStudents: number;
  totalPaid: number;
  pendingCount: number;
  structuresCount: number;
}

async function downloadCsv(path: string, fallbackName: string) {
  const res = await authFetch(path);
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    alert(typeof d?.error === "string" ? d.error : "Download failed");
    return;
  }
  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition");
  const m = cd?.match(/filename="([^"]+)"/);
  const name = m?.[1] ?? fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

interface BatchCourseOption {
  id: string;
  semester: number;
  batch: { name: string };
  course: { name: string; code: string };
}

interface AssignmentGradeSummary {
  id: string;
  title: string;
  maxMarks: number;
  submissionsCount: number;
  gradedCount: number;
  avgMarks: number | null;
}

interface ExamGradeRow {
  studentName: string;
  rollNumber: string;
  examType: string;
  marks: number;
  maxMarks: number;
  percentage: number;
  grade: string;
}

function gradeFromPercentage(pct: number): string {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  return "F";
}

export default function ReportsPage() {
  const [batchCourses, setBatchCourses] = useState<BatchCourseOption[]>([]);

  // Attendance report
  const [attendanceBcId, setAttendanceBcId] = useState("");
  const [attendanceReport, setAttendanceReport] = useState<AttendanceReportRow[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Grade report
  const [gradeBcId, setGradeBcId] = useState("");
  const [assignmentGrades, setAssignmentGrades] = useState<AssignmentGradeSummary[]>([]);
  const [examGrades, setExamGrades] = useState<ExamGradeRow[]>([]);
  const [loadingGrades, setLoadingGrades] = useState(false);

  // Fee report
  const [feeReport, setFeeReport] = useState<FeeReportData | null>(null);
  const [loadingFees, setLoadingFees] = useState(true);

  useEffect(() => {
    authFetch("/api/batch-courses")
      .then(r => r.json())
      .then(d => setBatchCourses(Array.isArray(d) ? d : d.batchCourses ?? []));

    // Auto-load fee report
    authFetch("/api/reports/fees")
      .then(r => r.json())
      .then((d: Record<string, unknown>) => {
        setFeeReport({
          totalStudents: Number(d.totalStudents ?? 0),
          totalPaid: Number(d.totalPaidAmount ?? 0),
          pendingCount: Number(d.pendingCount ?? 0),
          structuresCount: Number(d.totalStructures ?? 0),
        });
        setLoadingFees(false);
      })
      .catch(() => setLoadingFees(false));
  }, []);

  async function fetchAttendanceReport() {
    if (!attendanceBcId) return;
    setLoadingAttendance(true);
    const res = await authFetch(`/api/reports/attendance/${attendanceBcId}`);
    const data = await res.json();
    setAttendanceReport(Array.isArray(data) ? data : data.report ?? []);
    setLoadingAttendance(false);
  }

  async function fetchGradeReport() {
    if (!gradeBcId) return;
    setLoadingGrades(true);
    const res = await authFetch(`/api/reports/grades/${gradeBcId}`);
    const data = await res.json();
    setAssignmentGrades(data.assignments ?? []);
    const rawExams: Array<{
      studentName?: string; rollNumber?: string;
      student?: { user: { firstName: string; lastName: string }; rollNumber: string };
      examType?: string; type?: string;
      marks: number; maxMarks: number;
    }> = data.exams ?? [];
    setExamGrades(rawExams.map(e => {
      const pct = e.maxMarks > 0 ? (e.marks / e.maxMarks) * 100 : 0;
      return {
        studentName: e.studentName ?? (e.student ? `${e.student.user.firstName} ${e.student.user.lastName}` : "—"),
        rollNumber: e.rollNumber ?? e.student?.rollNumber ?? "—",
        examType: e.examType ?? e.type ?? "—",
        marks: e.marks,
        maxMarks: e.maxMarks,
        percentage: pct,
        grade: gradeFromPercentage(pct),
      };
    }));
    setLoadingGrades(false);
  }

  useEffect(() => {
    if (attendanceBcId) fetchAttendanceReport();
    else setAttendanceReport([]);
  }, [attendanceBcId]);

  useEffect(() => {
    if (gradeBcId) fetchGradeReport();
    else { setAssignmentGrades([]); setExamGrades([]); }
  }, [gradeBcId]);

  return (
    <div>
      <div className="mb-6">
        <h1 className={dash.pageTitle}>Reports</h1>
      </div>

      <div className="space-y-10">
        <section>
          <h2 className={`${dash.sectionTitle} mb-4`}>CSV exports</h2>
          <p className={`mb-3 text-sm ${dash.cellMuted}`}>
            Leadership can export fee payment rows. Other exports require Reports access and, where noted, a batch course selection.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={dash.btnSecondary}
              onClick={() => void downloadCsv("/api/reports/export?type=fees&format=csv", "fees.csv")}
            >
              Fees (leadership)
            </button>
            <button
              type="button"
              className={dash.btnSecondary}
              onClick={() => void downloadCsv("/api/reports/export?type=attendance&format=csv", "attendance.csv")}
            >
              Attendance summary
            </button>
            <button
              type="button"
              className={dash.btnSecondary}
              onClick={() => void downloadCsv("/api/reports/export?type=timetable&format=csv", "timetable.csv")}
            >
              Timetable (all)
            </button>
            <button
              type="button"
              className={dash.btnSecondary}
              onClick={() =>
                attendanceBcId
                  ? void downloadCsv(
                      `/api/reports/export?type=assignments&format=csv&batchCourseId=${encodeURIComponent(attendanceBcId)}`,
                      "assignments.csv"
                    )
                  : alert("Select a batch course in Attendance Report first (same list applies).")
              }
            >
              Assignments (uses batch course below)
            </button>
            <button
              type="button"
              className={dash.btnSecondary}
              onClick={() =>
                gradeBcId
                  ? void downloadCsv(
                      `/api/reports/export?type=exams&format=csv&batchCourseId=${encodeURIComponent(gradeBcId)}`,
                      "exams.csv"
                    )
                  : alert("Select a batch course in Grade Report first.")
              }
            >
              Exam grades (uses grade batch course)
            </button>
            <button
              type="button"
              className={dash.btnSecondary}
              onClick={() => void downloadCsv("/api/reports/export?type=general&format=csv", "general.csv")}
            >
              General stats
            </button>
            <button
              type="button"
              className={dash.btnSecondary}
              onClick={async () => {
                const res = await authFetch("/api/reports/timetable/conflicts");
                const d = await res.json();
                if (!res.ok) {
                  alert(typeof d?.error === "string" ? d.error : "Failed");
                  return;
                }
                const lines = [["kind", "message"], ...(d.conflicts ?? []).map((c: { kind: string; message: string }) => [c.kind, c.message])];
                const csv = lines.map((row: string[]) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "timetable-conflicts.csv";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Timetable conflicts (JSON → CSV)
            </button>
          </div>
        </section>

        <section>
          <h2 className={`${dash.sectionTitle} mb-4`}>Fee Report</h2>
          {loadingFees ? (
            <div className={`text-sm ${dash.cellMuted}`}>Loading fee data...</div>
          ) : feeReport ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className={`${dash.card} p-4 text-center`}>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{feeReport.totalStudents}</p>
                <p className={`mt-1 text-xs ${dash.cellMuted}`}>Total Students</p>
              </div>
              <div className={`${dash.card} p-4 text-center`}>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">₹{feeReport.totalPaid.toLocaleString()}</p>
                <p className={`mt-1 text-xs ${dash.cellMuted}`}>Total Collected</p>
              </div>
              <div className={`${dash.card} p-4 text-center`}>
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{feeReport.pendingCount}</p>
                <p className={`mt-1 text-xs ${dash.cellMuted}`}>Pending Payments</p>
              </div>
              <div className={`${dash.card} p-4 text-center`}>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{feeReport.structuresCount}</p>
                <p className={`mt-1 text-xs ${dash.cellMuted}`}>Fee Structures</p>
              </div>
            </div>
          ) : (
            <div className={`text-sm ${dash.cellMuted}`}>No fee data available</div>
          )}
        </section>

        <section>
          <h2 className={`${dash.sectionTitle} mb-4`}>Attendance Report</h2>
          <div className="mb-4 flex gap-3">
            <select
              value={attendanceBcId}
              onChange={e => setAttendanceBcId(e.target.value)}
              className={`${dash.select} min-w-[260px]`}
            >
              <option value="">Select batch course</option>
              {batchCourses.map(bc => (
                <option key={bc.id} value={bc.id}>
                  {bc.batch.name} — {bc.course.name} (Sem {bc.semester})
                </option>
              ))}
            </select>
          </div>

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
                  <th className={dash.th}>Attendance %</th>
                </tr>
              </thead>
              <tbody className={dash.tbodyDivide}>
                {loadingAttendance ? (
                  <tr><td colSpan={8} className={dash.emptyCell}>Loading...</td></tr>
                ) : attendanceReport.length === 0 ? (
                  <tr><td colSpan={8} className={dash.emptyCell}>
                    {attendanceBcId ? "No data found" : "Select a batch course to view report"}
                  </td></tr>
                ) : attendanceReport.map(row => (
                  <tr key={row.studentId} className={dash.rowHover}>
                    <td className={`px-4 py-3 ${dash.cellStrong}`}>{row.studentName}</td>
                    <td className={`px-4 py-3 ${dash.cellMono}`}>{row.rollNumber}</td>
                    <td className="px-4 py-3 text-green-600 dark:text-green-400">{row.present}</td>
                    <td className="px-4 py-3 text-red-600 dark:text-red-400">{row.absent}</td>
                    <td className="px-4 py-3 text-yellow-600 dark:text-yellow-400">{row.late}</td>
                    <td className="px-4 py-3 text-blue-600 dark:text-blue-400">{row.excused}</td>
                    <td className={`px-4 py-3 ${dash.cellMuted}`}>{row.total}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 min-w-[60px] flex-1 rounded-full bg-gray-100 dark:bg-gray-800">
                          <div
                            className={`h-2 rounded-full ${row.percentage >= 75 ? "bg-green-500 dark:bg-green-600" : "bg-red-400 dark:bg-red-500"}`}
                            style={{ width: `${Math.min(row.percentage, 100)}%` }}
                          />
                        </div>
                        <span className={`w-12 text-xs font-medium ${row.percentage >= 75 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                          {row.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className={`${dash.sectionTitle} mb-4`}>Grade Report</h2>
          <div className="mb-4 flex gap-3">
            <select
              value={gradeBcId}
              onChange={e => setGradeBcId(e.target.value)}
              className={`${dash.select} min-w-[260px]`}
            >
              <option value="">Select batch course</option>
              {batchCourses.map(bc => (
                <option key={bc.id} value={bc.id}>
                  {bc.batch.name} — {bc.course.name} (Sem {bc.semester})
                </option>
              ))}
            </select>
          </div>

          {loadingGrades ? (
            <div className={`text-sm ${dash.cellMuted}`}>Loading grades...</div>
          ) : gradeBcId ? (
            <div className="space-y-6">
              <div>
                <h3 className={`mb-2 text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300`}>Assignment Grades</h3>
                <div className={dash.tableWrap}>
                  <table className="w-full text-sm">
                    <thead className={dash.thead}>
                      <tr>
                        <th className={dash.th}>Assignment</th>
                        <th className={dash.th}>Max Marks</th>
                        <th className={dash.th}>Submissions</th>
                        <th className={dash.th}>Graded</th>
                        <th className={dash.th}>Avg Marks</th>
                      </tr>
                    </thead>
                    <tbody className={dash.tbodyDivide}>
                      {assignmentGrades.length === 0 ? (
                        <tr><td colSpan={5} className={dash.emptyCell}>No assignments</td></tr>
                      ) : assignmentGrades.map(a => (
                        <tr key={a.id} className={dash.rowHover}>
                          <td className={`px-4 py-3 ${dash.cellStrong}`}>{a.title}</td>
                          <td className={`px-4 py-3 ${dash.cellMono}`}>{a.maxMarks}</td>
                          <td className={`px-4 py-3 ${dash.cellMuted}`}>{a.submissionsCount}</td>
                          <td className={`px-4 py-3 ${dash.cellMuted}`}>{a.gradedCount}</td>
                          <td className={`px-4 py-3 ${dash.cellMono}`}>
                            {a.avgMarks !== null ? a.avgMarks.toFixed(1) : <span className={dash.emDash}>—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className={`mb-2 text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300`}>Exam Grades</h3>
                <div className={dash.tableWrap}>
                  <table className="w-full text-sm">
                    <thead className={dash.thead}>
                      <tr>
                        <th className={dash.th}>Student</th>
                        <th className={dash.th}>Roll No</th>
                        <th className={dash.th}>Exam Type</th>
                        <th className={dash.th}>Marks</th>
                        <th className={dash.th}>%</th>
                        <th className={dash.th}>Grade</th>
                      </tr>
                    </thead>
                    <tbody className={dash.tbodyDivide}>
                      {examGrades.length === 0 ? (
                        <tr><td colSpan={6} className={dash.emptyCell}>No exam data</td></tr>
                      ) : examGrades.map((e, i) => (
                        <tr key={i} className={dash.rowHover}>
                          <td className={`px-4 py-3 ${dash.cellStrong}`}>{e.studentName}</td>
                          <td className={`px-4 py-3 ${dash.cellMono}`}>{e.rollNumber}</td>
                          <td className={`px-4 py-3 ${dash.cellMuted}`}>{e.examType}</td>
                          <td className={`px-4 py-3 ${dash.cellMono}`}>{e.marks}/{e.maxMarks}</td>
                          <td className={`px-4 py-3 ${dash.cellMuted}`}>{e.percentage.toFixed(1)}%</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-1 text-xs font-bold ${
                              e.grade.startsWith("A") ? "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300" :
                              e.grade === "B" ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300" :
                              e.grade === "C" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300" :
                              e.grade === "D" ? "bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300" :
                              "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300"
                            }`}>
                              {e.grade}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className={`text-sm ${dash.cellMuted}`}>Select a batch course to view grade report</div>
          )}
        </section>
      </div>
    </div>
  );
}
