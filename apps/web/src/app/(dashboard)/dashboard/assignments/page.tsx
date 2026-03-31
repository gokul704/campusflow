"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/api";
import { dash } from "@/lib/dashboardUi";

interface Assignment {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  maxMarks: number;
  fileUrl?: string;
  batchCourse: {
    batch: { name: string };
    course: { name: string; code: string };
  };
  _count: { submissions: number };
}

interface Submission {
  id: string;
  marks?: number;
  remarks?: string;
  submittedAt: string;
  fileUrl?: string;
  studentId: string;
  student?: { rollNumber: string; user: { firstName: string; lastName: string } };
}

interface AssignmentDetail extends Assignment {
  submissions: Submission[];
}

interface BatchCourseOption {
  id: string;
  semester: number;
  batch: { name: string };
  course: { name: string; code: string };
}

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [batchCourses, setBatchCourses] = useState<BatchCourseOption[]>([]);
  const [filterBatchCourseId, setFilterBatchCourseId] = useState("");
  const [loading, setLoading] = useState(true);

  // Selected assignment for submissions view
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Create assignment modal
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    batchCourseId: "",
    title: "",
    description: "",
    dueDate: "",
    maxMarks: "100",
  });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // Grade modal
  const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);
  const [gradeForm, setGradeForm] = useState({ marks: "", remarks: "" });
  const [gradeError, setGradeError] = useState("");
  const [gradeLoading, setGradeLoading] = useState(false);

  async function fetchAssignments() {
    setLoading(true);
    const p = new URLSearchParams();
    if (filterBatchCourseId) p.set("batchCourseId", filterBatchCourseId);
    const res = await authFetch(`/api/assignments?${p}`);
    const data = await res.json();
    setAssignments(Array.isArray(data) ? data : data.assignments ?? []);
    setLoading(false);
  }

  useEffect(() => {
    authFetch("/api/batch-courses")
      .then(r => r.json())
      .then(d => setBatchCourses(Array.isArray(d) ? d : d.batchCourses ?? []));
  }, []);

  useEffect(() => { fetchAssignments(); }, [filterBatchCourseId]);

  async function viewAssignment(a: Assignment) {
    setLoadingDetail(true);
    setSelectedAssignment(null);
    const res = await authFetch(`/api/assignments/${a.id}`);
    const data = await res.json();
    setSelectedAssignment(data);
    setLoadingDetail(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);
    try {
      const body = {
        batchCourseId: form.batchCourseId,
        title: form.title,
        description: form.description || undefined,
        dueDate: form.dueDate,
        maxMarks: Number(form.maxMarks),
      };
      const res = await authFetch("/api/assignments", { method: "POST", body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? "Failed to create assignment"); return; }
      setShowForm(false);
      setForm({ batchCourseId: "", title: "", description: "", dueDate: "", maxMarks: "100" });
      fetchAssignments();
    } catch { setFormError("Something went wrong"); }
    finally { setFormLoading(false); }
  }

  async function handleDeleteAssignment(a: Assignment) {
    if (!confirm(`Delete assignment "${a.title}"?`)) return;
    const res = await authFetch(`/api/assignments/${a.id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); alert(d.error ?? "Failed to delete"); return; }
    fetchAssignments();
  }

  async function submitGrade(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAssignment || !gradingSubmission) return;
    setGradeError("");
    setGradeLoading(true);
    try {
      const body: Record<string, unknown> = { submissionId: gradingSubmission.id };
      if (gradeForm.marks !== "") body.marks = Number(gradeForm.marks);
      if (gradeForm.remarks) body.remarks = gradeForm.remarks;
      const res = await authFetch(`/api/assignments/${selectedAssignment.id}/grade`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setGradeError(data.error ?? "Failed to grade"); return; }
      setGradingSubmission(null);
      // Refresh detail
      viewAssignment(selectedAssignment);
    } catch { setGradeError("Something went wrong"); }
    finally { setGradeLoading(false); }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {selectedAssignment && (
            <button
              type="button"
              onClick={() => setSelectedAssignment(null)}
              className={`${dash.link} flex items-center gap-1`}
            >
              ← Back
            </button>
          )}
          <h1 className={dash.pageTitle}>
            {selectedAssignment ? selectedAssignment.title : "Assignments"}
          </h1>
        </div>
        {!selectedAssignment && (
          <button
            type="button"
            onClick={() => { setForm({ batchCourseId: "", title: "", description: "", dueDate: "", maxMarks: "100" }); setFormError(""); setShowForm(true); }}
            className={dash.btnPrimary}
          >
            + Create Assignment
          </button>
        )}
      </div>

      {!selectedAssignment ? (
        <>
          <div className="mb-4 flex gap-3">
            <select
              value={filterBatchCourseId}
              onChange={e => setFilterBatchCourseId(e.target.value)}
              className={dash.select}
            >
              <option value="">All Batch Courses</option>
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
                  <th className={dash.th}>Title</th>
                  <th className={dash.th}>Course</th>
                  <th className={dash.th}>Batch</th>
                  <th className={dash.th}>Due Date</th>
                  <th className={dash.th}>Max Marks</th>
                  <th className={dash.th}>Submissions</th>
                  <th className={dash.th}>Actions</th>
                </tr>
              </thead>
              <tbody className={dash.tbodyDivide}>
                {loading ? (
                  <tr><td colSpan={7} className={dash.emptyCell}>Loading...</td></tr>
                ) : assignments.length === 0 ? (
                  <tr><td colSpan={7} className={dash.emptyCell}>No assignments found</td></tr>
                ) : assignments.map(a => (
                  <tr key={a.id} className={dash.rowHover}>
                    <td className={`px-4 py-3 ${dash.cellStrong}`}>{a.title}</td>
                    <td className={`px-4 py-3 ${dash.cellMono}`}>{a.batchCourse.course.code}</td>
                    <td className={`px-4 py-3 ${dash.cellMuted}`}>{a.batchCourse.batch.name}</td>
                    <td className={`px-4 py-3 ${dash.cellMuted}`}>{new Date(a.dueDate).toLocaleString()}</td>
                    <td className={`px-4 py-3 ${dash.cellMuted}`}>{a.maxMarks}</td>
                    <td className={`px-4 py-3 ${dash.cellMuted}`}>{a._count.submissions}</td>
                    <td className="flex gap-3 px-4 py-3">
                      <button
                        type="button"
                        onClick={() => viewAssignment(a)}
                        className={dash.btnLink}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAssignment(a)}
                        className={dash.btnDanger}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          {/* Assignment detail + submissions */}
          <div className={`${dash.card} mb-6 p-5`}>
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <p className={`mb-1 text-xs font-medium uppercase ${dash.cellMuted}`}>Course</p>
                <p className={dash.cellStrong}>{selectedAssignment.batchCourse.course.name} ({selectedAssignment.batchCourse.course.code})</p>
              </div>
              <div>
                <p className={`mb-1 text-xs font-medium uppercase ${dash.cellMuted}`}>Batch</p>
                <p className={dash.cellStrong}>{selectedAssignment.batchCourse.batch.name}</p>
              </div>
              <div>
                <p className={`mb-1 text-xs font-medium uppercase ${dash.cellMuted}`}>Due Date</p>
                <p className={dash.cellStrong}>{new Date(selectedAssignment.dueDate).toLocaleString()}</p>
              </div>
              <div>
                <p className={`mb-1 text-xs font-medium uppercase ${dash.cellMuted}`}>Max Marks</p>
                <p className={dash.cellStrong}>{selectedAssignment.maxMarks}</p>
              </div>
            </div>
            {selectedAssignment.description && (
              <p className={`mt-4 border-t border-gray-100 pt-4 text-sm dark:border-gray-800 ${dash.cellMuted}`}>{selectedAssignment.description}</p>
            )}
          </div>

          <h2 className={`${dash.sectionTitle} mb-3`}>
            Submissions ({selectedAssignment.submissions.length})
          </h2>

          {loadingDetail ? (
            <div className={`py-8 text-center ${dash.cellMuted}`}>Loading submissions...</div>
          ) : (
            <div className={dash.tableWrap}>
              <table className="w-full text-sm">
                <thead className={dash.thead}>
                  <tr>
                    <th className={dash.th}>Student</th>
                    <th className={dash.th}>Roll No</th>
                    <th className={dash.th}>Submitted At</th>
                    <th className={dash.th}>File</th>
                    <th className={dash.th}>Marks</th>
                    <th className={dash.th}>Actions</th>
                  </tr>
                </thead>
                <tbody className={dash.tbodyDivide}>
                  {selectedAssignment.submissions.length === 0 ? (
                    <tr><td colSpan={6} className={dash.emptyCell}>No submissions yet</td></tr>
                  ) : selectedAssignment.submissions.map(sub => (
                    <tr key={sub.id} className={dash.rowHover}>
                      <td className={`px-4 py-3 ${dash.cellStrong}`}>
                        {sub.student ? `${sub.student.user.firstName} ${sub.student.user.lastName}` : sub.studentId}
                      </td>
                      <td className={`px-4 py-3 ${dash.cellMono}`}>{sub.student?.rollNumber ?? "—"}</td>
                      <td className={`px-4 py-3 ${dash.cellMuted}`}>{new Date(sub.submittedAt).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        {sub.fileUrl ? (
                          <a href={sub.fileUrl} target="_blank" rel="noreferrer" className={`${dash.btnLink} text-xs`}>
                            View File
                          </a>
                        ) : <span className={`text-xs ${dash.emDash}`}>—</span>}
                      </td>
                      <td className={`px-4 py-3 ${dash.cellMono}`}>
                        {sub.marks !== undefined && sub.marks !== null ? `${sub.marks}/${selectedAssignment.maxMarks}` : <span className={dash.emDash}>—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => {
                            setGradingSubmission(sub);
                            setGradeForm({ marks: sub.marks !== undefined && sub.marks !== null ? String(sub.marks) : "", remarks: sub.remarks ?? "" });
                            setGradeError("");
                          }}
                          className={dash.btnLink}
                        >
                          Grade
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Create Assignment Modal */}
      {showForm && (
        <div className={dash.modalOverlay}>
          <div className={`${dash.modalPanel} ${dash.modalScroll} max-h-[90vh] w-full max-w-lg`}>
            <h2 className={`${dash.sectionTitle} mb-4`}>Create Assignment</h2>
            {formError && <div className={dash.errorBanner}>{formError}</div>}
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className={dash.label}>Batch Course</label>
                <select
                  value={form.batchCourseId}
                  onChange={e => setForm(f => ({ ...f, batchCourseId: e.target.value }))}
                  required
                  className={dash.selectFull}
                >
                  <option value="">Select batch course</option>
                  {batchCourses.map(bc => (
                    <option key={bc.id} value={bc.id}>
                      {bc.batch.name} — {bc.course.name} (Sem {bc.semester})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={dash.label}>Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  required
                  className={dash.input}
                />
              </div>
              <div>
                <label className={dash.label}>Description (optional)</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className={dash.textarea}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={dash.label}>Due Date</label>
                  <input
                    type="datetime-local"
                    value={form.dueDate}
                    onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                    required
                    className={dash.input}
                  />
                </div>
                <div>
                  <label className={dash.label}>Max Marks</label>
                  <input
                    type="number"
                    min={0}
                    value={form.maxMarks}
                    onChange={e => setForm(f => ({ ...f, maxMarks: e.target.value }))}
                    required
                    className={dash.input}
                  />
                </div>
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

      {/* Grade Modal */}
      {gradingSubmission && selectedAssignment && (
        <div className={dash.modalOverlay}>
          <div className={`${dash.modalPanel} w-full max-w-sm`}>
            <h2 className={`${dash.sectionTitle} mb-1`}>Grade Submission</h2>
            <p className={`mb-4 text-sm ${dash.cellMuted}`}>
              {gradingSubmission.student
                ? `${gradingSubmission.student.user.firstName} ${gradingSubmission.student.user.lastName}`
                : gradingSubmission.studentId}
            </p>
            {gradeError && <div className={dash.errorBanner}>{gradeError}</div>}
            <form onSubmit={submitGrade} className="space-y-3">
              <div>
                <label className={dash.label}>
                  Marks (out of {selectedAssignment.maxMarks})
                </label>
                <input
                  type="number"
                  min={0}
                  max={selectedAssignment.maxMarks}
                  value={gradeForm.marks}
                  onChange={e => setGradeForm(g => ({ ...g, marks: e.target.value }))}
                  className={dash.input}
                />
              </div>
              <div>
                <label className={dash.label}>Remarks (optional)</label>
                <textarea
                  value={gradeForm.remarks}
                  onChange={e => setGradeForm(g => ({ ...g, remarks: e.target.value }))}
                  rows={2}
                  className={dash.textarea}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setGradingSubmission(null)}
                  className={`flex-1 ${dash.btnSecondary}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={gradeLoading}
                  className={`flex-1 ${dash.btnPrimary}`}
                >
                  {gradeLoading ? "Saving..." : "Save Grade"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
