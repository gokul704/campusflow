"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/api";
import { dash } from "@/lib/dashboardUi";

interface BatchCourse {
  id: string;
  semester: number;
  batch?: { name: string };
  course?: { name: string; code: string };
  section?: { name: string | null };
  faculty?: { user?: { firstName: string; lastName: string } | null } | null;
}

interface BatchItem { id: string; name: string; }
interface SectionItem { id: string; name: string; }
interface CourseItem { id: string; name: string; code: string; }
interface FacultyItem { id: string; user: { firstName: string; lastName: string }; }

export default function BatchCoursesPage() {
  const [batchCourses, setBatchCourses] = useState<BatchCourse[]>([]);
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [faculty, setFaculty] = useState<FacultyItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterBatchId, setFilterBatchId] = useState("");
  const [filterSectionId, setFilterSectionId] = useState("");
  const [filterSemester, setFilterSemester] = useState("");

  // Form
  const [showForm, setShowForm] = useState(false);
  const [formSections, setFormSections] = useState<SectionItem[]>([]);
  const [form, setForm] = useState({ batchId: "", sectionId: "", courseId: "", semester: "1", facultyId: "" });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  async function fetchBatchCourses() {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (filterBatchId) p.set("batchId", filterBatchId);
      if (filterSectionId) p.set("sectionId", filterSectionId);
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
    authFetch("/api/courses").then(r => r.json()).then(d => setCourses(Array.isArray(d) ? d : d.courses ?? []));
    authFetch("/api/faculty").then(r => r.json()).then(d => setFaculty(Array.isArray(d) ? d : d.faculty ?? []));
  }, []);

  // Fetch sections when filter batch changes
  useEffect(() => {
    if (filterBatchId) {
      authFetch(`/api/sections?batchId=${filterBatchId}`).then(r => r.json()).then(d => setSections(Array.isArray(d) ? d : []));
    } else {
      setSections([]);
    }
    setFilterSectionId("");
  }, [filterBatchId]);

  useEffect(() => { fetchBatchCourses(); }, [filterBatchId, filterSectionId, filterSemester]);

  // Fetch sections for the form when form batch changes
  useEffect(() => {
    if (form.batchId) {
      authFetch(`/api/sections?batchId=${form.batchId}`).then(r => r.json()).then(d => setFormSections(Array.isArray(d) ? d : []));
    } else {
      setFormSections([]);
    }
    setForm(f => ({ ...f, sectionId: "" }));
  }, [form.batchId]);

  async function openForm() {
    setForm({ batchId: "", sectionId: "", courseId: "", semester: "1", facultyId: "" });
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
        sectionId: form.sectionId,
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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className={dash.pageTitle}>Batch Courses</h1>
        <button type="button" onClick={openForm} className={dash.btnPrimary}>
          + Assign Course
        </button>
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
        {filterBatchId && (
          <select
            value={filterSectionId}
            onChange={e => setFilterSectionId(e.target.value)}
            className={dash.select}
          >
            <option value="">All Sections</option>
            {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
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
              <th className={dash.th}>Section</th>
              <th className={dash.th}>Course Code</th>
              <th className={dash.th}>Course Name</th>
              <th className={dash.th}>Semester</th>
              <th className={dash.th}>Faculty</th>
              <th className={dash.th}>Actions</th>
            </tr>
          </thead>
          <tbody className={dash.tbodyDivide}>
            {loading ? (
              <tr><td colSpan={7} className={dash.emptyCell}>Loading...</td></tr>
            ) : batchCourses.length === 0 ? (
              <tr><td colSpan={7} className={dash.emptyCell}>No batch courses found</td></tr>
            ) : batchCourses.map(bc => (
              <tr key={bc.id} className={dash.rowHover}>
                <td className={`px-4 py-3 ${dash.cellStrong}`}>{bc.batch?.name ?? "—"}</td>
                <td className={`px-4 py-3 ${dash.cellMuted}`}>
                  {bc.section?.name ? bc.section.name : <span className={dash.emDash}>&mdash;</span>}
                </td>
                <td className={`px-4 py-3 ${dash.cellMono}`}>{bc.course?.code ?? "—"}</td>
                <td className={`px-4 py-3 ${dash.cellStrong}`}>{bc.course?.name ?? "—"}</td>
                <td className={`px-4 py-3 ${dash.cellMuted}`}>Semester {bc.semester}</td>
                <td className={`px-4 py-3 ${dash.cellMuted}`}>
                  {bc.faculty?.user
                    ? `${bc.faculty.user.firstName} ${bc.faculty.user.lastName}`
                    : <span className={dash.emDash}>&mdash;</span>}
                </td>
                <td className="px-4 py-3">
                  <button type="button" onClick={() => handleDelete(bc)} className={dash.btnDanger}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
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
                <label className={dash.label}>Section</label>
                <select
                  value={form.sectionId}
                  onChange={e => setForm(f => ({ ...f, sectionId: e.target.value }))}
                  required
                  disabled={!form.batchId}
                  className={dash.selectFullDisabled}
                >
                  <option value="">{form.batchId ? "Select section" : "Select a batch first"}</option>
                  {formSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
    </div>
  );
}
