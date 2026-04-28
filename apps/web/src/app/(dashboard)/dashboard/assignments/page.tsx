"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { authFetch, authenticatedDownloadUrl, formatApiError } from "@/lib/api";
import { dash } from "@/lib/dashboardUi";

interface Assignment {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  maxMarks: number;
  fileUrl?: string | null;
  filePath?: string | null;
  batchCourse: {
    batch: { name: string };
    course: { name: string; code: string };
  };
  _count: { submissions: number };
}

interface Submission {
  id: string;
  marks?: number | null;
  remarks?: string;
  submittedAt: string;
  fileUrl?: string | null;
  filePath?: string | null;
  verifiedAt?: string | null;
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

interface MeProfile {
  role: string;
  studentProfile: { id: string; batchId: string; rollNumber: string } | null;
}

interface MyAssignment extends Assignment {
  submissions: Submission[];
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result;
      if (typeof r !== "string") {
        reject(new Error("Could not read file"));
        return;
      }
      const i = r.indexOf(",");
      resolve(i >= 0 ? r.slice(i + 1) : r);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.readAsDataURL(file);
  });
}

function submissionFileHref(sub: Submission): string | null {
  if (sub.filePath) return authenticatedDownloadUrl(`/api/assignments/submission-file/${sub.id}`);
  if (sub.fileUrl) return sub.fileUrl;
  return null;
}

function assignmentHandoutHref(a: { id: string; filePath?: string | null; fileUrl?: string | null }): string | null {
  if (a.filePath) return authenticatedDownloadUrl(`/api/assignments/handout-file/${a.id}`);
  if (a.fileUrl) return a.fileUrl;
  return null;
}

function isAssignmentPastDue(dueDate: string): boolean {
  const t = new Date(dueDate).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() > t;
}

export default function AssignmentsPage() {
  const searchParams = useSearchParams();
  const assignmentParam = searchParams.get("assignment");

  const [me, setMe] = useState<MeProfile | null>(null);
  const [meLoading, setMeLoading] = useState(true);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [myAssignments, setMyAssignments] = useState<MyAssignment[]>([]);
  const [batchCourses, setBatchCourses] = useState<BatchCourseOption[]>([]);
  const [filterBatchCourseId, setFilterBatchCourseId] = useState("");
  const [loading, setLoading] = useState(true);
  const [myLoading, setMyLoading] = useState(true);

  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    batchCourseId: "",
    title: "",
    description: "",
    dueDate: "",
    maxMarks: "100",
    materialUrl: "",
  });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);
  const [gradeForm, setGradeForm] = useState({ marks: "", remarks: "" });
  const [gradeError, setGradeError] = useState("");
  const [gradeLoading, setGradeLoading] = useState(false);

  const [verifyLoadingId, setVerifyLoadingId] = useState<string | null>(null);

  const [studentModalAssignment, setStudentModalAssignment] = useState<MyAssignment | null>(null);
  const [studentRemarks, setStudentRemarks] = useState("");
  const [studentSubmitLoading, setStudentSubmitLoading] = useState(false);
  const [studentSubmitError, setStudentSubmitError] = useState("");
  const studentFileRef = useRef<HTMLInputElement>(null);
  const createHandoutFileRef = useRef<HTMLInputElement>(null);
  const highlightRef = useRef<HTMLTableRowElement>(null);

  const isStudentRole = me?.role === "STUDENT" || me?.role === "GUEST_STUDENT";
  const isLeadership = me?.role === "ADMIN" || me?.role === "CMD" || me?.role === "PRINCIPAL";
  const studentProfile = me?.studentProfile ?? null;
  const isStudentPortal = Boolean(isStudentRole && studentProfile);
  const isStudentWithoutProfile = Boolean(isStudentRole && !studentProfile);

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (filterBatchCourseId) p.set("batchCourseId", filterBatchCourseId);
    const res = await authFetch(`/api/assignments?${p}`);
    const data = await res.json();
    setAssignments(Array.isArray(data) ? data : data.assignments ?? []);
    setLoading(false);
  }, [filterBatchCourseId]);

  const fetchMyAssignments = useCallback(async () => {
    setMyLoading(true);
    const res = await authFetch("/api/assignments/my");
    const data = await res.json();
    if (!res.ok) {
      setMyAssignments([]);
      setMyLoading(false);
      return;
    }
    setMyAssignments(Array.isArray(data) ? data : []);
    setMyLoading(false);
  }, []);

  useEffect(() => {
    authFetch("/api/auth/me")
      .then(r => r.json())
      .then(d => {
        const p = d.profile as MeProfile | undefined;
        setMe(p ?? null);
      })
      .catch(() => setMe(null))
      .finally(() => setMeLoading(false));
  }, []);

  useEffect(() => {
    authFetch("/api/batch-courses")
      .then(r => r.json())
      .then(d => setBatchCourses(Array.isArray(d) ? d : d.batchCourses ?? []));
  }, []);

  useEffect(() => {
    if (meLoading) return;
    if (isStudentPortal) {
      void fetchMyAssignments();
      return;
    }
    void fetchAssignments();
  }, [meLoading, isStudentPortal, fetchAssignments, fetchMyAssignments]);

  useEffect(() => {
    if (!isStudentPortal || !assignmentParam || myLoading) return;
    const t = window.setTimeout(() => {
      highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    return () => window.clearTimeout(t);
  }, [assignmentParam, isStudentPortal, myLoading, myAssignments]);

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
      const file = createHandoutFileRef.current?.files?.[0];
      let fileBase64: string | undefined;
      let fileName: string | undefined;
      if (file) {
        fileBase64 = await fileToBase64(file);
        fileName = file.name;
      }
      const body: Record<string, unknown> = {
        batchCourseId: form.batchCourseId,
        title: form.title,
        description: form.description || undefined,
        dueDate: form.dueDate,
        maxMarks: Number(form.maxMarks),
      };
      if (form.materialUrl.trim()) body.fileUrl = form.materialUrl.trim();
      if (fileBase64) {
        body.fileBase64 = fileBase64;
        body.fileName = fileName;
      }
      const res = await authFetch("/api/assignments", { method: "POST", body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) {
        setFormError(formatApiError(data));
        return;
      }
      setShowForm(false);
      setForm({ batchCourseId: "", title: "", description: "", dueDate: "", maxMarks: "100", materialUrl: "" });
      if (createHandoutFileRef.current) createHandoutFileRef.current.value = "";
      fetchAssignments();
    } catch {
      setFormError("Something went wrong");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDeleteAssignment(a: Assignment) {
    if (!confirm(`Delete assignment "${a.title}"?`)) return;
    const res = await authFetch(`/api/assignments/${a.id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json();
      alert(formatApiError(d));
      return;
    }
    fetchAssignments();
  }

  async function submitGrade(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAssignment || !gradingSubmission) return;
    setGradeError("");
    setGradeLoading(true);
    try {
      const body: Record<string, unknown> = {
        studentId: gradingSubmission.studentId,
        marks: gradeForm.marks === "" ? 0 : Number(gradeForm.marks),
      };
      if (gradeForm.remarks) body.remarks = gradeForm.remarks;
      const res = await authFetch(`/api/assignments/${selectedAssignment.id}/grade`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setGradeError(formatApiError(data));
        return;
      }
      setGradingSubmission(null);
      viewAssignment(selectedAssignment);
    } catch {
      setGradeError("Something went wrong");
    } finally {
      setGradeLoading(false);
    }
  }

  async function verifySubmissionRow(sub: Submission) {
    if (!selectedAssignment) return;
    setVerifyLoadingId(sub.id);
    try {
      const res = await authFetch(`/api/assignments/${selectedAssignment.id}/verify`, {
        method: "POST",
        body: JSON.stringify({ studentId: sub.studentId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(formatApiError(data));
        return;
      }
      viewAssignment(selectedAssignment);
    } finally {
      setVerifyLoadingId(null);
    }
  }

  function openStudentSubmit(a: MyAssignment) {
    const sub = a.submissions[0];
    setStudentModalAssignment(a);
    setStudentRemarks(sub?.remarks ?? "");
    setStudentSubmitError("");
    if (studentFileRef.current) studentFileRef.current.value = "";
  }

  async function handleStudentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentModalAssignment) return;
    if (isAssignmentPastDue(studentModalAssignment.dueDate)) {
      setStudentSubmitError("Submission deadline has passed.");
      return;
    }
    setStudentSubmitError("");
    setStudentSubmitLoading(true);
    try {
      const file = studentFileRef.current?.files?.[0];
      let fileBase64: string | undefined;
      let fileName: string | undefined;
      if (file) {
        fileBase64 = await fileToBase64(file);
        fileName = file.name;
      }
      if (!fileBase64?.trim() && !studentRemarks.trim()) {
        setStudentSubmitError("Choose a file to upload or enter remarks.");
        setStudentSubmitLoading(false);
        return;
      }
      const body: Record<string, unknown> = {};
      if (fileBase64) {
        body.fileBase64 = fileBase64;
        body.fileName = fileName;
      }
      if (studentRemarks.trim()) body.remarks = studentRemarks.trim();

      const res = await authFetch(`/api/assignments/${studentModalAssignment.id}/submit`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setStudentSubmitError(formatApiError(data));
        return;
      }
      setStudentModalAssignment(null);
      fetchMyAssignments();
    } catch {
      setStudentSubmitError("Something went wrong");
    } finally {
      setStudentSubmitLoading(false);
    }
  }

  function mySubmissionStatus(sub: Submission | undefined): string {
    if (!sub) return "Not submitted";
    if (sub.marks != null) return `Graded: ${sub.marks}`;
    if (sub.verifiedAt) return "Verified";
    return "Submitted";
  }

  if (meLoading) {
    return (
      <div className={`py-12 text-center ${dash.cellMuted}`}>Loading...</div>
    );
  }

  if (isStudentWithoutProfile) {
    return (
      <div>
        <h1 className={dash.pageTitle}>Assignments</h1>
        <p className={`mt-4 ${dash.cellMuted}`}>
          Your account is not linked to a student record. Contact the institute if you need access to assignments.
        </p>
      </div>
    );
  }

  if (isStudentPortal) {
    return (
      <div>
        <h1 className={dash.pageTitle}>My assignments</h1>
        <p className={`mb-6 text-sm ${dash.cellMuted}`}>
          Upload your work before the due date. Faculty will verify submissions and assign marks.
        </p>

        <div className={dash.tableWrap}>
          <table className="w-full text-sm">
            <thead className={dash.thead}>
                <tr>
                  <th className={dash.th}>Course</th>
                  <th className={dash.th}>Title</th>
                  <th className={dash.th}>Due</th>
                  <th className={dash.th}>Status</th>
                  <th className={dash.th}>Materials</th>
                  <th className={dash.th}>Your file</th>
                  <th className={dash.th}>Actions</th>
                </tr>
            </thead>
            <tbody className={dash.tbodyDivide}>
                {myLoading ? (
                  <tr>
                    <td colSpan={7} className={dash.emptyCell}>
                      Loading...
                    </td>
                  </tr>
                ) : myAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={dash.emptyCell}>
                      No assignments for your batch yet.
                    </td>
                  </tr>
                ) : (
                  myAssignments.map(a => {
                  const sub = a.submissions[0];
                  const href = sub ? submissionFileHref(sub) : null;
                  const handoutHref = assignmentHandoutHref(a);
                  const pastDue = isAssignmentPastDue(a.dueDate);
                  const highlight = assignmentParam === a.id;
                  return (
                    <tr
                      key={a.id}
                      ref={highlight ? highlightRef : undefined}
                      className={highlight ? `${dash.rowHover} bg-amber-50/80 dark:bg-amber-950/30` : dash.rowHover}
                    >
                      <td className={`px-4 py-3 ${dash.cellMono}`}>{a.batchCourse.course.code}</td>
                      <td className={`px-4 py-3 ${dash.cellStrong}`}>{a.title}</td>
                      <td className={`px-4 py-3 ${dash.cellMuted}`}>{new Date(a.dueDate).toLocaleString()}</td>
                      <td className={`px-4 py-3 ${dash.cellMuted}`}>{mySubmissionStatus(sub)}</td>
                      <td className="px-4 py-3">
                        {handoutHref ? (
                          <a href={handoutHref} target="_blank" rel="noreferrer" className={`${dash.btnLink} text-xs`}>
                            Download
                          </a>
                        ) : (
                          <span className={`text-xs ${dash.emDash}`}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {href ? (
                          <a href={href} target="_blank" rel="noreferrer" className={`${dash.btnLink} text-xs`}>
                            Download
                          </a>
                        ) : (
                          <span className={`text-xs ${dash.emDash}`}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {pastDue ? (
                          <span className="text-xs font-medium text-rose-600 dark:text-rose-400">
                            Deadline over
                          </span>
                        ) : (
                          <button type="button" onClick={() => openStudentSubmit(a)} className={dash.btnLink}>
                            {sub ? "Update submission" : "Submit"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {studentModalAssignment && (
          <div className={dash.modalOverlay}>
            <div className={`${dash.modalPanel} ${dash.modalScroll} max-h-[90vh] w-full max-w-lg`}>
              {(() => {
                const pastDue = isAssignmentPastDue(studentModalAssignment.dueDate);
                return (
                  <>
              <h2 className={`${dash.sectionTitle} mb-1`}>{studentModalAssignment.title}</h2>
              <p className={`mb-4 text-sm ${dash.cellMuted}`}>
                {studentModalAssignment.batchCourse.course.name} · Due{" "}
                {new Date(studentModalAssignment.dueDate).toLocaleString()}
              </p>
              {pastDue && (
                <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
                  Submission deadline has passed. You can no longer upload or update this assignment.
                </div>
              )}
              {(() => {
                const mat = assignmentHandoutHref(studentModalAssignment);
                return mat ? (
                  <p className="mb-4">
                    <a href={mat} target="_blank" rel="noreferrer" className={`${dash.btnLink} text-sm`}>
                      Download assignment materials
                    </a>
                  </p>
                ) : null;
              })()}
              {studentModalAssignment.description && (
                <p className={`mb-4 text-sm ${dash.cellMuted}`}>{studentModalAssignment.description}</p>
              )}
              {studentSubmitError && <div className={dash.errorBanner}>{studentSubmitError}</div>}
              <form onSubmit={handleStudentSubmit} className="space-y-3">
                <div>
                  <label className={dash.label}>Your submission file (max ~15MB)</label>
                  <input ref={studentFileRef} type="file" className={dash.input} />
                </div>
                <div>
                  <label className={dash.label}>Remarks (optional)</label>
                  <textarea
                    value={studentRemarks}
                    onChange={e => setStudentRemarks(e.target.value)}
                    rows={3}
                    className={dash.textarea}
                  />
                </div>
                <p className={`text-xs ${dash.cellMuted}`}>
                  Uploading a new file clears verification until faculty verifies again.
                </p>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStudentModalAssignment(null)}
                    className={`flex-1 ${dash.btnSecondary}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={studentSubmitLoading || pastDue}
                    className={`flex-1 ${dash.btnPrimary}`}
                  >
                    {pastDue ? "Deadline Over" : studentSubmitLoading ? "Uploading..." : "Submit"}
                  </button>
                </div>
              </form>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    );
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
        {!selectedAssignment && isLeadership && (
          <button
            type="button"
            onClick={() => {
              setForm({ batchCourseId: "", title: "", description: "", dueDate: "", maxMarks: "100", materialUrl: "" });
              setFormError("");
              if (createHandoutFileRef.current) createHandoutFileRef.current.value = "";
              setShowForm(true);
            }}
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
                  <tr>
                    <td colSpan={7} className={dash.emptyCell}>
                      Loading...
                    </td>
                  </tr>
                ) : assignments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={dash.emptyCell}>
                      No assignments found
                    </td>
                  </tr>
                ) : (
                  assignments.map(a => (
                    <tr key={a.id} className={dash.rowHover}>
                      <td className={`px-4 py-3 ${dash.cellStrong}`}>{a.title}</td>
                      <td className={`px-4 py-3 ${dash.cellMono}`}>{a.batchCourse.course.code}</td>
                      <td className={`px-4 py-3 ${dash.cellMuted}`}>{a.batchCourse.batch.name}</td>
                      <td className={`px-4 py-3 ${dash.cellMuted}`}>{new Date(a.dueDate).toLocaleString()}</td>
                      <td className={`px-4 py-3 ${dash.cellMuted}`}>{a.maxMarks}</td>
                      <td className={`px-4 py-3 ${dash.cellMuted}`}>{a._count.submissions}</td>
                      <td className="flex gap-3 px-4 py-3">
                        <button type="button" onClick={() => viewAssignment(a)} className={dash.btnLink}>
                          View
                        </button>
                        <button type="button" onClick={() => handleDeleteAssignment(a)} className={dash.btnDanger}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className={`${dash.card} mb-6 p-5`}>
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <p className={`mb-1 text-xs font-medium uppercase ${dash.cellMuted}`}>Course</p>
                <p className={dash.cellStrong}>
                  {selectedAssignment.batchCourse.course.name} ({selectedAssignment.batchCourse.course.code})
                </p>
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
              <p className={`mt-4 border-t border-gray-100 pt-4 text-sm dark:border-gray-800 ${dash.cellMuted}`}>
                {selectedAssignment.description}
              </p>
            )}
            {(() => {
              const mat = assignmentHandoutHref(selectedAssignment);
              return mat ? (
                <p className={`mt-4 border-t border-gray-100 pt-4 dark:border-gray-800`}>
                  <span className={`mr-2 text-xs font-medium uppercase ${dash.cellMuted}`}>Materials</span>
                  <a href={mat} target="_blank" rel="noreferrer" className={`${dash.btnLink} text-sm`}>
                    Download handout
                  </a>
                </p>
              ) : null;
            })()}
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
                    <th className={dash.th}>Verified</th>
                    <th className={dash.th}>Marks</th>
                    <th className={dash.th}>Actions</th>
                  </tr>
                </thead>
                <tbody className={dash.tbodyDivide}>
                  {selectedAssignment.submissions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className={dash.emptyCell}>
                        No submissions yet
                      </td>
                    </tr>
                  ) : (
                    selectedAssignment.submissions.map(sub => {
                      const href = submissionFileHref(sub);
                      return (
                        <tr key={sub.id} className={dash.rowHover}>
                          <td className={`px-4 py-3 ${dash.cellStrong}`}>
                            {sub.student
                              ? `${sub.student.user.firstName} ${sub.student.user.lastName}`
                              : sub.studentId}
                          </td>
                          <td className={`px-4 py-3 ${dash.cellMono}`}>{sub.student?.rollNumber ?? "—"}</td>
                          <td className={`px-4 py-3 ${dash.cellMuted}`}>
                            {new Date(sub.submittedAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            {href ? (
                              <a href={href} target="_blank" rel="noreferrer" className={`${dash.btnLink} text-xs`}>
                                View file
                              </a>
                            ) : (
                              <span className={`text-xs ${dash.emDash}`}>—</span>
                            )}
                          </td>
                          <td className={`px-4 py-3 ${dash.cellMuted}`}>
                            {sub.verifiedAt ? (
                              <span className="text-emerald-600 dark:text-emerald-400">Yes</span>
                            ) : (
                              <span>No</span>
                            )}
                          </td>
                          <td className={`px-4 py-3 ${dash.cellMono}`}>
                            {sub.marks !== undefined && sub.marks !== null ? (
                              `${sub.marks}/${selectedAssignment.maxMarks}`
                            ) : (
                              <span className={dash.emDash}>—</span>
                            )}
                          </td>
                          <td className="flex flex-wrap gap-2 px-4 py-3">
                            {!sub.verifiedAt && (
                              <button
                                type="button"
                                disabled={verifyLoadingId === sub.id}
                                onClick={() => verifySubmissionRow(sub)}
                                className={dash.btnLink}
                              >
                                {verifyLoadingId === sub.id ? "..." : "Verify"}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setGradingSubmission(sub);
                                setGradeForm({
                                  marks:
                                    sub.marks !== undefined && sub.marks !== null ? String(sub.marks) : "",
                                  remarks: sub.remarks ?? "",
                                });
                                setGradeError("");
                              }}
                              className={dash.btnLink}
                            >
                              Grade
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {isLeadership && showForm && (
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
              <div>
                <label className={dash.label}>Assignment file (optional, max ~15MB)</label>
                <input ref={createHandoutFileRef} type="file" className={dash.input} />
              </div>
              <div>
                <label className={dash.label}>Or material link (optional)</label>
                <input
                  type="url"
                  value={form.materialUrl}
                  onChange={e => setForm(f => ({ ...f, materialUrl: e.target.value }))}
                  placeholder="https://…"
                  className={dash.input}
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
                  onClick={() => {
                    setShowForm(false);
                    if (createHandoutFileRef.current) createHandoutFileRef.current.value = "";
                  }}
                  className={`flex-1 ${dash.btnSecondary}`}
                >
                  Cancel
                </button>
                <button type="submit" disabled={formLoading} className={`flex-1 ${dash.btnPrimary}`}>
                  {formLoading ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                <label className={dash.label}>Marks (out of {selectedAssignment.maxMarks})</label>
                <input
                  type="number"
                  min={0}
                  max={selectedAssignment.maxMarks}
                  value={gradeForm.marks}
                  onChange={e => setGradeForm(g => ({ ...g, marks: e.target.value }))}
                  className={dash.input}
                  required
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
                <button type="submit" disabled={gradeLoading} className={`flex-1 ${dash.btnPrimary}`}>
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
