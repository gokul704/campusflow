"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
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

interface AttendanceCourseWiseRow {
  batchCourseId: string;
  batchName: string;
  courseName: string;
  courseCode: string;
  semester: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  studentsMarked: number;
  percentage: number;
}

interface AttendanceStudentCourseRow {
  batchCourseId: string;
  batchName: string;
  courseName: string;
  courseCode: string;
  semester: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  percentage: number;
}

interface AttendanceBatchWiseRow {
  batchId: string;
  batchName: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  studentsMarked: number;
  percentage: number;
}

interface AttendanceSemesterWiseRow {
  semester: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  studentsMarked: number;
  percentage: number;
}

interface StudentOption {
  id: string;
  rollNumber: string;
  user: { firstName: string; lastName: string };
}

interface FeeReportData {
  totalStudents: number;
  totalPaid: number;
  pendingCount: number;
  structuresCount: number;
}

async function downloadXlsxFromCsvEndpoint(path: string, fallbackName: string) {
  const res = await authFetch(path);
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    alert(typeof d?.error === "string" ? d.error : "Download failed");
    return;
  }
  const csvText = await res.text();
  const wb = XLSX.read(csvText, { type: "string" });
  const safeName = fallbackName.toLowerCase().endsWith(".xlsx") ? fallbackName : `${fallbackName}.xlsx`;
  XLSX.writeFile(wb, safeName);
}

function downloadXlsxFromRows(sheetName: string, fileName: string, rows: Array<Record<string, string | number>>) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName.toLowerCase().endsWith(".xlsx") ? fileName : `${fileName}.xlsx`);
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
  const [allowed, setAllowed] = useState<boolean | null>(null);

  // Attendance report
  const [attendanceBcId, setAttendanceBcId] = useState("");
  const [attendanceReport, setAttendanceReport] = useState<AttendanceReportRow[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [attendanceView, setAttendanceView] = useState<"individual" | "batch" | "semester">("individual");
  const [courseWiseAttendance, setCourseWiseAttendance] = useState<AttendanceCourseWiseRow[]>([]);
  const [loadingCourseWiseAttendance, setLoadingCourseWiseAttendance] = useState(false);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [studentAttendanceId, setStudentAttendanceId] = useState("");
  const [studentWiseAttendance, setStudentWiseAttendance] = useState<AttendanceStudentCourseRow[]>([]);
  const [loadingStudentWiseAttendance, setLoadingStudentWiseAttendance] = useState(false);
  const [batchWiseAttendance, setBatchWiseAttendance] = useState<AttendanceBatchWiseRow[]>([]);
  const [loadingBatchWiseAttendance, setLoadingBatchWiseAttendance] = useState(false);
  const [semesterWiseAttendance, setSemesterWiseAttendance] = useState<AttendanceSemesterWiseRow[]>([]);
  const [loadingSemesterWiseAttendance, setLoadingSemesterWiseAttendance] = useState(false);

  // Grade report
  const [gradeBcId, setGradeBcId] = useState("");
  const [assignmentGrades, setAssignmentGrades] = useState<AssignmentGradeSummary[]>([]);
  const [examGrades, setExamGrades] = useState<ExamGradeRow[]>([]);
  const [loadingGrades, setLoadingGrades] = useState(false);

  // Fee report
  const [feeReport, setFeeReport] = useState<FeeReportData | null>(null);
  const [loadingFees, setLoadingFees] = useState(true);
  const [meRole, setMeRole] = useState<string | null>(null);

  const canAdminExport = meRole === "ADMIN" || meRole === "CMD" || meRole === "PRINCIPAL";

  useEffect(() => {
    authFetch("/api/auth/me")
      .then((r) => r.json())
      .then((d: { user?: { role?: string } }) => setMeRole(typeof d?.user?.role === "string" ? d.user.role : null))
      .catch(() => setMeRole(null));
  }, []);

  useEffect(() => {
    authFetch("/api/auth/permissions")
      .then(async (r) => {
        const d = await r.json().catch(() => null);
        setAllowed(Boolean(d?.modules?.reports?.view));
      })
      .catch(() => setAllowed(false));
  }, []);

  useEffect(() => {
    if (allowed !== true) return;
    authFetch("/api/batch-courses")
      .then(r => r.json())
      .then(d => setBatchCourses(Array.isArray(d) ? d : d.batchCourses ?? []));
    authFetch("/api/students?limit=500")
      .then(r => r.json())
      .then(d => setStudents(Array.isArray(d?.students) ? d.students : Array.isArray(d) ? d : []))
      .catch(() => setStudents([]));

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
      .catch(() => {
        setFeeReport(null);
        setLoadingFees(false);
      });
  }, [allowed]);

  function downloadCourseWiseAttendanceXlsx() {
    if (courseWiseAttendance.length === 0) return;
    downloadXlsxFromRows(
      "CourseWiseAttendance",
      "attendance-course-wise.xlsx",
      courseWiseAttendance.map((row) => ({
        Batch: row.batchName,
        Course: row.courseName,
        "Course code": row.courseCode,
        Semester: row.semester,
        "Students marked": row.studentsMarked,
        Present: row.present,
        Absent: row.absent,
        Late: row.late,
        Excused: row.excused,
        Total: row.total,
        "Attendance %": Number(row.percentage.toFixed(1)),
      }))
    );
  }

  function downloadStudentWiseAttendanceXlsx() {
    if (studentWiseAttendance.length === 0 || !studentAttendanceId) return;
    const st = students.find((s) => s.id === studentAttendanceId);
    const suffix = st ? `${st.rollNumber}-${st.user.firstName}-${st.user.lastName}`.replace(/\s+/g, "-") : studentAttendanceId;
    downloadXlsxFromRows(
      "StudentWiseAttendance",
      `attendance-student-${suffix}.xlsx`,
      studentWiseAttendance.map((row) => ({
        Batch: row.batchName,
        Course: row.courseName,
        "Course code": row.courseCode,
        Semester: row.semester,
        Present: row.present,
        Absent: row.absent,
        Late: row.late,
        Excused: row.excused,
        Total: row.total,
        "Attendance %": Number(row.percentage.toFixed(1)),
      }))
    );
  }

  function downloadBatchWiseAttendanceXlsx() {
    if (batchWiseAttendance.length === 0) return;
    downloadXlsxFromRows(
      "BatchWiseAttendance",
      "attendance-batch-wise.xlsx",
      batchWiseAttendance.map((row) => ({
        Batch: row.batchName,
        "Students marked": row.studentsMarked,
        Present: row.present,
        Absent: row.absent,
        Late: row.late,
        Excused: row.excused,
        Total: row.total,
        "Attendance %": Number(row.percentage.toFixed(1)),
      }))
    );
  }

  function downloadSemesterWiseAttendanceXlsx() {
    if (semesterWiseAttendance.length === 0) return;
    downloadXlsxFromRows(
      "SemesterWiseAttendance",
      "attendance-semester-wise.xlsx",
      semesterWiseAttendance.map((row) => ({
        Semester: row.semester,
        "Students marked": row.studentsMarked,
        Present: row.present,
        Absent: row.absent,
        Late: row.late,
        Excused: row.excused,
        Total: row.total,
        "Attendance %": Number(row.percentage.toFixed(1)),
      }))
    );
  }


  async function fetchAttendanceReport() {
    if (!attendanceBcId) return;
    setLoadingAttendance(true);
    const res = await authFetch(`/api/reports/attendance/${attendanceBcId}`);
    const data = await res.json();
    setAttendanceReport(Array.isArray(data) ? data : data.report ?? []);
    setLoadingAttendance(false);
  }

  async function fetchCourseWiseAttendanceReport() {
    setLoadingCourseWiseAttendance(true);
    const res = await authFetch("/api/reports/attendance/course-wise");
    const data = await res.json();
    setCourseWiseAttendance(Array.isArray(data) ? data : data.report ?? []);
    setLoadingCourseWiseAttendance(false);
  }

  async function fetchStudentWiseAttendanceReport() {
    if (!studentAttendanceId) return;
    setLoadingStudentWiseAttendance(true);
    const res = await authFetch(`/api/reports/attendance/student-wise?studentId=${encodeURIComponent(studentAttendanceId)}`);
    const data = await res.json();
    setStudentWiseAttendance(Array.isArray(data?.courses) ? data.courses : []);
    setLoadingStudentWiseAttendance(false);
  }

  async function fetchBatchWiseAttendanceReport() {
    setLoadingBatchWiseAttendance(true);
    const res = await authFetch("/api/reports/attendance/batch-wise");
    const data = await res.json();
    setBatchWiseAttendance(Array.isArray(data) ? data : data.report ?? []);
    setLoadingBatchWiseAttendance(false);
  }

  async function fetchSemesterWiseAttendanceReport() {
    setLoadingSemesterWiseAttendance(true);
    const res = await authFetch("/api/reports/attendance/semester-wise");
    const data = await res.json();
    setSemesterWiseAttendance(Array.isArray(data) ? data : data.report ?? []);
    setLoadingSemesterWiseAttendance(false);
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
    if (allowed !== true) {
      setAttendanceReport([]);
      return;
    }
    if (attendanceBcId) fetchAttendanceReport();
    else setAttendanceReport([]);
  }, [allowed, attendanceBcId]);

  useEffect(() => {
    if (allowed !== true) {
      setCourseWiseAttendance([]);
      return;
    }
    if (attendanceView !== "individual") return;
    fetchCourseWiseAttendanceReport();
  }, [allowed, attendanceView]);

  useEffect(() => {
    if (allowed !== true) {
      setStudentWiseAttendance([]);
      return;
    }
    if (attendanceView !== "individual") return;
    if (!studentAttendanceId) {
      setStudentWiseAttendance([]);
      return;
    }
    fetchStudentWiseAttendanceReport();
  }, [allowed, attendanceView, studentAttendanceId]);

  useEffect(() => {
    if (allowed !== true) {
      setBatchWiseAttendance([]);
      return;
    }
    if (attendanceView !== "batch") return;
    fetchBatchWiseAttendanceReport();
  }, [allowed, attendanceView]);

  useEffect(() => {
    if (allowed !== true) {
      setSemesterWiseAttendance([]);
      return;
    }
    if (attendanceView !== "semester") return;
    fetchSemesterWiseAttendanceReport();
  }, [allowed, attendanceView]);

  useEffect(() => {
    if (allowed !== true) {
      setAssignmentGrades([]);
      setExamGrades([]);
      return;
    }
    if (gradeBcId) fetchGradeReport();
    else { setAssignmentGrades([]); setExamGrades([]); }
  }, [allowed, gradeBcId]);

  if (allowed == null) {
    return (
      <div>
        <h1 className={dash.pageTitle}>Reports</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Checking permissions…</p>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className={`${dash.card} p-6`}>
        <h1 className={dash.pageTitle}>Reports</h1>
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          You do not have access to Reports.
        </p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className={dash.pageTitle}>Reports</h1>
        <p className={`mt-2 max-w-2xl text-sm ${dash.cellMuted}`}>
          Downloads are per section below. Export/download actions are available only for admin-level users.
        </p>
      </div>

      <div className="space-y-10">
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className={dash.sectionTitle}>Fee Report</h2>
            {canAdminExport ? (
              <button
                type="button"
                className={dash.btnSecondary}
                onClick={() => void downloadXlsxFromCsvEndpoint("/api/reports/export?type=fees&format=csv", "fee-payments.xlsx")}
              >
                Download fee payments (XLSX)
              </button>
            ) : null}
          </div>
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
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className={dash.sectionTitle}>Attendance Report</h2>
            <div className="flex flex-wrap items-center gap-2">
              {canAdminExport ? (
                <>
                  <button
                    type="button"
                    className={dash.btnSecondary}
                    onClick={() => void downloadXlsxFromCsvEndpoint("/api/reports/export?type=attendance&format=csv", "attendance-summary-all-students.xlsx")}
                  >
                    Download all students summary (XLSX)
                  </button>
                  {attendanceView === "individual" && courseWiseAttendance.length > 0 ? (
                    <button type="button" className={dash.btnSecondary} onClick={downloadCourseWiseAttendanceXlsx}>
                      Download individual-wise table (XLSX)
                    </button>
                  ) : null}
                  {attendanceView === "individual" && studentWiseAttendance.length > 0 ? (
                    <button type="button" className={dash.btnSecondary} onClick={downloadStudentWiseAttendanceXlsx}>
                      Download selected student table (XLSX)
                    </button>
                  ) : null}
                  {attendanceView === "batch" && batchWiseAttendance.length > 0 ? (
                    <button type="button" className={dash.btnSecondary} onClick={downloadBatchWiseAttendanceXlsx}>
                      Download batch-wise table (XLSX)
                    </button>
                  ) : null}
                  {attendanceView === "semester" && semesterWiseAttendance.length > 0 ? (
                    <button type="button" className={dash.btnSecondary} onClick={downloadSemesterWiseAttendanceXlsx}>
                      Download semester-wise table (XLSX)
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setAttendanceView("individual")}
              className={attendanceView === "individual" ? dash.tabActive : dash.tabInactive}
            >
              Individual-wise
            </button>
            <button
              type="button"
              onClick={() => setAttendanceView("batch")}
              className={attendanceView === "batch" ? dash.tabActive : dash.tabInactive}
            >
              Batch-wise
            </button>
            <button
              type="button"
              onClick={() => setAttendanceView("semester")}
              className={attendanceView === "semester" ? dash.tabActive : dash.tabInactive}
            >
              Semester-wise
            </button>
          </div>
          {attendanceView === "individual" ? (
            <>
              <div className={dash.tableWrap}>
                <table className="w-full text-sm">
                  <thead className={dash.thead}>
                    <tr>
                      <th className={dash.th}>Batch</th>
                      <th className={dash.th}>Course</th>
                      <th className={dash.th}>Sem</th>
                      <th className={dash.th}>Students Marked</th>
                      <th className={dash.th}>Present</th>
                      <th className={dash.th}>Absent</th>
                      <th className={dash.th}>Late</th>
                      <th className={dash.th}>Excused</th>
                      <th className={dash.th}>Total</th>
                      <th className={dash.th}>Attendance %</th>
                    </tr>
                  </thead>
                  <tbody className={dash.tbodyDivide}>
                    {loadingCourseWiseAttendance ? (
                      <tr><td colSpan={10} className={dash.emptyCell}>Loading...</td></tr>
                    ) : courseWiseAttendance.length === 0 ? (
                      <tr><td colSpan={10} className={dash.emptyCell}>No individual-wise attendance data found</td></tr>
                    ) : courseWiseAttendance.map(row => (
                      <tr key={row.batchCourseId} className={dash.rowHover}>
                        <td className={`px-4 py-3 ${dash.cellStrong}`}>{row.batchName}</td>
                        <td className={`px-4 py-3 ${dash.cellMuted}`}>{row.courseName} ({row.courseCode})</td>
                        <td className={`px-4 py-3 ${dash.cellMono}`}>{row.semester}</td>
                        <td className={`px-4 py-3 ${dash.cellMono}`}>{row.studentsMarked}</td>
                        <td className="px-4 py-3 text-green-600 dark:text-green-400">{row.present}</td>
                        <td className="px-4 py-3 text-red-600 dark:text-red-400">{row.absent}</td>
                        <td className="px-4 py-3 text-yellow-600 dark:text-yellow-400">{row.late}</td>
                        <td className="px-4 py-3 text-blue-600 dark:text-blue-400">{row.excused}</td>
                        <td className={`px-4 py-3 ${dash.cellMuted}`}>{row.total}</td>
                        <td className={`px-4 py-3 ${dash.cellMono}`}>{row.percentage.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mb-4 flex gap-3">
                <select
                  value={studentAttendanceId}
                  onChange={e => setStudentAttendanceId(e.target.value)}
                  className={`${dash.select} min-w-[260px]`}
                >
                  <option value="">Select student</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.user.firstName} {s.user.lastName} ({s.rollNumber})
                    </option>
                  ))}
                </select>
              </div>
              <div className={dash.tableWrap}>
                <table className="w-full text-sm">
                  <thead className={dash.thead}>
                    <tr>
                      <th className={dash.th}>Batch</th>
                      <th className={dash.th}>Course</th>
                      <th className={dash.th}>Sem</th>
                      <th className={dash.th}>Present</th>
                      <th className={dash.th}>Absent</th>
                      <th className={dash.th}>Late</th>
                      <th className={dash.th}>Excused</th>
                      <th className={dash.th}>Total</th>
                      <th className={dash.th}>Attendance %</th>
                    </tr>
                  </thead>
                  <tbody className={dash.tbodyDivide}>
                    {loadingStudentWiseAttendance ? (
                      <tr><td colSpan={9} className={dash.emptyCell}>Loading...</td></tr>
                    ) : studentWiseAttendance.length === 0 ? (
                      <tr><td colSpan={9} className={dash.emptyCell}>
                        {studentAttendanceId ? "No student-wise attendance data found" : "Select a student to view report"}
                      </td></tr>
                    ) : studentWiseAttendance.map(row => (
                      <tr key={row.batchCourseId} className={dash.rowHover}>
                        <td className={`px-4 py-3 ${dash.cellStrong}`}>{row.batchName}</td>
                        <td className={`px-4 py-3 ${dash.cellMuted}`}>{row.courseName} ({row.courseCode})</td>
                        <td className={`px-4 py-3 ${dash.cellMono}`}>{row.semester}</td>
                        <td className="px-4 py-3 text-green-600 dark:text-green-400">{row.present}</td>
                        <td className="px-4 py-3 text-red-600 dark:text-red-400">{row.absent}</td>
                        <td className="px-4 py-3 text-yellow-600 dark:text-yellow-400">{row.late}</td>
                        <td className="px-4 py-3 text-blue-600 dark:text-blue-400">{row.excused}</td>
                        <td className={`px-4 py-3 ${dash.cellMuted}`}>{row.total}</td>
                        <td className={`px-4 py-3 ${dash.cellMono}`}>{row.percentage.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : attendanceView === "batch" ? (
            <div className={dash.tableWrap}>
              <table className="w-full text-sm">
                <thead className={dash.thead}>
                  <tr>
                    <th className={dash.th}>Batch</th>
                    <th className={dash.th}>Students Marked</th>
                    <th className={dash.th}>Present</th>
                    <th className={dash.th}>Absent</th>
                    <th className={dash.th}>Late</th>
                    <th className={dash.th}>Excused</th>
                    <th className={dash.th}>Total</th>
                    <th className={dash.th}>Attendance %</th>
                  </tr>
                </thead>
                <tbody className={dash.tbodyDivide}>
                  {loadingBatchWiseAttendance ? (
                    <tr><td colSpan={8} className={dash.emptyCell}>Loading...</td></tr>
                  ) : batchWiseAttendance.length === 0 ? (
                    <tr><td colSpan={8} className={dash.emptyCell}>No batch-wise attendance data found</td></tr>
                  ) : batchWiseAttendance.map((row) => (
                    <tr key={row.batchId} className={dash.rowHover}>
                      <td className={`px-4 py-3 ${dash.cellStrong}`}>{row.batchName}</td>
                      <td className={`px-4 py-3 ${dash.cellMono}`}>{row.studentsMarked}</td>
                      <td className="px-4 py-3 text-green-600 dark:text-green-400">{row.present}</td>
                      <td className="px-4 py-3 text-red-600 dark:text-red-400">{row.absent}</td>
                      <td className="px-4 py-3 text-yellow-600 dark:text-yellow-400">{row.late}</td>
                      <td className="px-4 py-3 text-blue-600 dark:text-blue-400">{row.excused}</td>
                      <td className={`px-4 py-3 ${dash.cellMuted}`}>{row.total}</td>
                      <td className={`px-4 py-3 ${dash.cellMono}`}>{row.percentage.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={dash.tableWrap}>
              <table className="w-full text-sm">
                <thead className={dash.thead}>
                  <tr>
                    <th className={dash.th}>Semester</th>
                    <th className={dash.th}>Students Marked</th>
                    <th className={dash.th}>Present</th>
                    <th className={dash.th}>Absent</th>
                    <th className={dash.th}>Late</th>
                    <th className={dash.th}>Excused</th>
                    <th className={dash.th}>Total</th>
                    <th className={dash.th}>Attendance %</th>
                  </tr>
                </thead>
                <tbody className={dash.tbodyDivide}>
                  {loadingSemesterWiseAttendance ? (
                    <tr><td colSpan={8} className={dash.emptyCell}>Loading...</td></tr>
                  ) : semesterWiseAttendance.length === 0 ? (
                    <tr><td colSpan={8} className={dash.emptyCell}>No semester-wise attendance data found</td></tr>
                  ) : semesterWiseAttendance.map((row) => (
                    <tr key={`semester-${row.semester}`} className={dash.rowHover}>
                      <td className={`px-4 py-3 ${dash.cellStrong}`}>Semester {row.semester}</td>
                      <td className={`px-4 py-3 ${dash.cellMono}`}>{row.studentsMarked}</td>
                      <td className="px-4 py-3 text-green-600 dark:text-green-400">{row.present}</td>
                      <td className="px-4 py-3 text-red-600 dark:text-red-400">{row.absent}</td>
                      <td className="px-4 py-3 text-yellow-600 dark:text-yellow-400">{row.late}</td>
                      <td className="px-4 py-3 text-blue-600 dark:text-blue-400">{row.excused}</td>
                      <td className={`px-4 py-3 ${dash.cellMuted}`}>{row.total}</td>
                      <td className={`px-4 py-3 ${dash.cellMono}`}>{row.percentage.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h2 className={`${dash.sectionTitle} mb-4`}>Grade Report</h2>
          <div className="mb-4 flex flex-wrap items-end gap-3">
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
            {canAdminExport && gradeBcId ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={dash.btnSecondary}
                  onClick={() =>
                    void downloadXlsxFromCsvEndpoint(
                      `/api/reports/export?type=assignments&format=csv&batchCourseId=${encodeURIComponent(gradeBcId)}`,
                      `assignments-${gradeBcId}.xlsx`
                    )
                  }
                >
                  Download assignments (XLSX)
                </button>
                <button
                  type="button"
                  className={dash.btnSecondary}
                  onClick={() =>
                    void downloadXlsxFromCsvEndpoint(
                      `/api/reports/export?type=exams&format=csv&batchCourseId=${encodeURIComponent(gradeBcId)}`,
                      `exam-grades-${gradeBcId}.xlsx`
                    )
                  }
                >
                  Download exam grades (XLSX)
                </button>
              </div>
            ) : null}
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
