"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/api";
import { dash } from "@/lib/dashboardUi";

interface ExamGradeRow {
  id: string;
  examType: string;
  marks: number;
  maxMarks: number;
  remarks?: string | null;
  student: {
    rollNumber: string;
    user: { firstName: string; lastName: string };
  };
  batchCourse: {
    batch: { name: string };
    course: { name: string; code: string };
  };
}

interface BatchCourseOption {
  id: string;
  semester: number;
  batch: { name: string };
  course: { name: string; code: string };
}

export default function ExamGradesPage() {
  const [rows, setRows] = useState<ExamGradeRow[]>([]);
  const [batchCourses, setBatchCourses] = useState<BatchCourseOption[]>([]);
  const [filterBatchCourseId, setFilterBatchCourseId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch("/api/batch-courses")
      .then((r) => r.json())
      .then((d) => setBatchCourses(Array.isArray(d) ? d : d.batchCourses ?? []));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const p = new URLSearchParams();
      if (filterBatchCourseId) p.set("batchCourseId", filterBatchCourseId);
      const res = await authFetch(`/api/exam-grades?${p}`);
      const data = await res.json();
      if (!cancelled) {
        setRows(Array.isArray(data) ? data : []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filterBatchCourseId]);

  return (
    <div>
      <h1 className={`${dash.pageTitle} mb-6`}>Exam grades</h1>

      <div className="mb-4 flex gap-3">
        <select
          value={filterBatchCourseId}
          onChange={(e) => setFilterBatchCourseId(e.target.value)}
          className={`${dash.select} max-w-md`}
        >
          <option value="">All batch courses</option>
          {batchCourses.map((bc) => (
            <option key={bc.id} value={bc.id}>
              {bc.batch.name} · {bc.course.code} — {bc.course.name} (Sem {bc.semester})
            </option>
          ))}
        </select>
      </div>

      <div className={dash.tableWrap}>
        <table className="w-full text-sm">
          <thead className={dash.thead}>
            <tr>
              <th className={dash.th}>Student</th>
              <th className={dash.th}>Roll</th>
              <th className={dash.th}>Course</th>
              <th className={dash.th}>Exam</th>
              <th className={dash.th}>Marks</th>
            </tr>
          </thead>
          <tbody className={dash.tbodyDivide}>
            {loading ? (
              <tr>
                <td colSpan={5} className={dash.emptyCell}>
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className={dash.emptyCell}>
                  No exam grades found
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className={dash.rowHover}>
                  <td className={`px-4 py-3 ${dash.cellStrong}`}>
                    {r.student.user.firstName} {r.student.user.lastName}
                  </td>
                  <td className={`px-4 py-3 ${dash.cellMono}`}>{r.student.rollNumber}</td>
                  <td className={`px-4 py-3 ${dash.cellMuted}`}>
                    <span className={dash.cellStrong}>{r.batchCourse.course.code}</span> · {r.batchCourse.batch.name}
                  </td>
                  <td className={`px-4 py-3 ${dash.cellMuted}`}>{r.examType}</td>
                  <td className={`px-4 py-3 ${dash.cellStrong}`}>
                    {r.marks} / {r.maxMarks}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
