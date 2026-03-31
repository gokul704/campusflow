"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/api";
import { dash } from "@/lib/dashboardUi";

interface Course {
  id: string;
  name: string;
  code: string;
  credits: number;
  semester: number;
  department: { name: string; code: string };
  _count: { enrollments: number };
}

interface Department { id: string; name: string; code: string; }

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filterDept, setFilterDept] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", departmentId: "", credits: "3", semester: "1" });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  async function fetchCourses() {
    setLoading(true);
    const p = new URLSearchParams();
    if (filterDept) p.set("departmentId", filterDept);
    const res = await authFetch(`/api/courses?${p}`);
    setCourses(await res.json());
    setLoading(false);
  }

  useEffect(() => {
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
        body: JSON.stringify({ ...form, credits: Number(form.credits), semester: Number(form.semester) }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? "Failed"); return; }
      setShowForm(false);
      setForm({ name: "", code: "", departmentId: "", credits: "3", semester: "1" });
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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className={dash.pageTitle}>Courses</h1>
        <button type="button" onClick={() => setShowForm(true)} className={dash.btnPrimary}>
          + Add Course
        </button>
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
              <th className={dash.th}>Semester</th>
              <th className={dash.th}>Credits</th>
              <th className={dash.th}>Students</th>
              <th className={dash.th}>Actions</th>
            </tr>
          </thead>
          <tbody className={dash.tbodyDivide}>
            {loading ? (
              <tr><td colSpan={7} className={dash.emptyCell}>Loading...</td></tr>
            ) : courses.length === 0 ? (
              <tr><td colSpan={7} className={dash.emptyCell}>No courses yet</td></tr>
            ) : courses.map((c) => (
              <tr key={c.id} className={dash.rowHover}>
                <td className={`px-4 py-3 ${dash.cellMono}`}>{c.code}</td>
                <td className={`px-4 py-3 ${dash.cellStrong}`}>{c.name}</td>
                <td className={`px-4 py-3 ${dash.cellMuted}`}>{c.department?.name}</td>
                <td className={`px-4 py-3 ${dash.cellMuted}`}>Sem {c.semester}</td>
                <td className={`px-4 py-3 ${dash.cellMuted}`}>{c.credits}</td>
                <td className={`px-4 py-3 ${dash.cellMuted}`}>{c._count?.enrollments}</td>
                <td className="px-4 py-3">
                  <button type="button" onClick={() => handleDelete(c.id)} className={dash.btnDanger}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={dash.label}>Semester</label>
                  <input type="number" min={1} max={12} value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))} required
                    className={dash.input} />
                </div>
                <div>
                  <label className={dash.label}>Credits</label>
                  <input type="number" min={0} max={10} value={form.credits} onChange={e => setForm(f => ({ ...f, credits: e.target.value }))} required
                    className={dash.input} />
                </div>
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
    </div>
  );
}
