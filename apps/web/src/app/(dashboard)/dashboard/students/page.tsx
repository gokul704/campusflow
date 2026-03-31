"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/api";
import { dash } from "@/lib/dashboardUi";

interface Student {
  id: string;
  rollNumber: string;
  user: { firstName: string; lastName: string; email: string; phone?: string | null; dateOfBirth?: string | null; isActive: boolean };
  batch: { name: string };
  section?: { name: string };
}

interface StudentDetailSlot {
  id: string;
  startTime: string;
  endTime: string;
  room?: string | null;
  batchCourse: {
    batch: { name: string };
    section?: { name: string };
    course: { name: string; code: string };
    faculty?: { user: { firstName: string; lastName: string } } | null;
  };
}

interface StudentDetail extends Student {
  parentName?: string | null;
  parentPhone?: string | null;
  address?: string | null;
  scheduleToday: { dayName: string; slots: StudentDetailSlot[] };
}

function formatDob(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

interface Batch { id: string; name: string; }
interface Section { id: string; name: string; }
interface UserOption { id: string; firstName: string; lastName: string; email: string; }

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [filterBatch, setFilterBatch] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [users, setUsers] = useState<UserOption[]>([]);
  const [formSections, setFormSections] = useState<Section[]>([]);
  const [form, setForm] = useState({ userId: "", batchId: "", sectionId: "", rollNumber: "", parentName: "", parentPhone: "", address: "" });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const [viewStudent, setViewStudent] = useState<StudentDetail | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState("");

  async function openView(studentId: string) {
    setViewStudent(null);
    setViewError("");
    setViewLoading(true);
    try {
      const res = await authFetch(`/api/students/${studentId}`);
      const data = await res.json();
      if (!res.ok) {
        setViewError(data.error ?? "Could not load student");
        return;
      }
      setViewStudent(data as StudentDetail);
    } catch {
      setViewError("Could not load student");
    } finally {
      setViewLoading(false);
    }
  }

  function closeStudentView() {
    setViewStudent(null);
    setViewError("");
    setViewLoading(false);
  }

  async function fetchStudents() {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), limit: "20" });
    if (filterBatch) p.set("batchId", filterBatch);
    if (filterSection) p.set("sectionId", filterSection);
    if (search) p.set("search", search);
    const res = await authFetch(`/api/students?${p}`);
    const data = await res.json();
    setStudents(data.students ?? []);
    setTotal(data.pagination?.total ?? 0);
    setLoading(false);
  }

  useEffect(() => {
    authFetch("/api/batches").then(r => r.json()).then(setBatches);
  }, []);

  // Fetch sections when filter batch changes
  useEffect(() => {
    if (filterBatch) {
      authFetch(`/api/sections?batchId=${filterBatch}`).then(r => r.json()).then(d => setSections(Array.isArray(d) ? d : []));
    } else {
      setSections([]);
    }
    setFilterSection("");
  }, [filterBatch]);

  useEffect(() => { fetchStudents(); }, [page, filterBatch, filterSection]);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchStudents(); }, 400);
    return () => clearTimeout(t);
  }, [search]);

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
    const res = await authFetch("/api/users?role=STUDENT&limit=100");
    const data = await res.json();
    // Filter users who don't have a student profile yet
    setUsers(data.users ?? []);
    setShowForm(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);
    try {
      const res = await authFetch("/api/students", { method: "POST", body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? "Failed"); return; }
      setShowForm(false);
      setForm({ userId: "", batchId: "", sectionId: "", rollNumber: "", parentName: "", parentPhone: "", address: "" });
      fetchStudents();
    } catch { setFormError("Something went wrong"); }
    finally { setFormLoading(false); }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className={dash.pageTitle}>Students</h1>
        <button type="button" onClick={openForm} className={dash.btnPrimary}>
          + Add Student Profile
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={dash.inputSearch}
        />
        <select
          value={filterBatch}
          onChange={(e) => { setFilterBatch(e.target.value); setPage(1); }}
          className={dash.select}
        >
          <option value="">All Batches</option>
          {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        {filterBatch && (
          <select
            value={filterSection}
            onChange={(e) => { setFilterSection(e.target.value); setPage(1); }}
            className={dash.select}
          >
            <option value="">All Sections</option>
            {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
      </div>

      <div className={dash.tableWrap}>
        <table className="w-full text-sm">
          <thead className={dash.thead}>
            <tr>
              <th className={dash.th}>Roll No</th>
              <th className={dash.th}>Name</th>
              <th className={dash.th}>Email</th>
              <th className={dash.th}>Batch</th>
              <th className={dash.th}>Section</th>
              <th className={dash.th}>Status</th>
              <th className={`${dash.th} w-24 text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody className={dash.tbodyDivide}>
            {loading ? (
              <tr><td colSpan={7} className={dash.emptyCell}>Loading...</td></tr>
            ) : students.length === 0 ? (
              <tr><td colSpan={7} className={dash.emptyCell}>No students found</td></tr>
            ) : students.map((s) => (
              <tr key={s.id} className={dash.rowHover}>
                <td className={`px-4 py-3 ${dash.cellMono}`}>{s.rollNumber}</td>
                <td className={`px-4 py-3 ${dash.cellStrong}`}>{s.user.firstName} {s.user.lastName}</td>
                <td className={`px-4 py-3 ${dash.cellMuted}`}>{s.user.email}</td>
                <td className={`px-4 py-3 ${dash.cellMuted}`}>{s.batch?.name}</td>
                <td className={`px-4 py-3 ${dash.cellMuted}`}>
                  {s.section?.name ? s.section.name : <span className={dash.emDash}>&mdash;</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={s.user.isActive ? dash.statusPillActive : dash.statusPillInactive}>
                    {s.user.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button type="button" onClick={() => openView(s.id)} className={dash.link}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {total > 20 && (
          <div className={dash.paginationBar}>
            <span>Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</span>
            <div className="flex gap-2">
              <button type="button" disabled={page === 1} onClick={() => setPage(p => p - 1)} className={dash.paginationBtn}>Prev</button>
              <button type="button" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)} className={dash.paginationBtn}>Next</button>
            </div>
          </div>
        )}
      </div>

      {(viewLoading || viewStudent || viewError) && (
        <div className={`${dash.modalOverlay} p-4`}>
          <div className={`${dash.modalPanel} ${dash.modalScroll} max-w-lg`}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className={dash.sectionTitle}>Student details</h2>
              <button type="button" onClick={closeStudentView} className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                Close
              </button>
            </div>
            {viewLoading && <p className={`py-8 text-center text-sm ${dash.cellMuted}`}>Loading…</p>}
            {viewError && !viewLoading && <p className="py-4 text-sm text-red-600 dark:text-red-400">{viewError}</p>}
            {viewStudent && !viewLoading && (() => {
              const schedule = viewStudent.scheduleToday ?? { dayName: "Today", slots: [] as StudentDetailSlot[] };
              return (
              <div className="space-y-4 text-sm">
                <dl className="grid grid-cols-1 gap-3">
                  <div className={`flex justify-between gap-4 ${dash.rowDivider}`}>
                    <dt className={dash.dt}>Name</dt>
                    <dd className={`${dash.dd} font-medium`}>{viewStudent.user.firstName} {viewStudent.user.lastName}</dd>
                  </div>
                  <div className={`flex justify-between gap-4 ${dash.rowDivider}`}>
                    <dt className={dash.dt}>Date of birth</dt>
                    <dd className={dash.dd}>{formatDob(viewStudent.user.dateOfBirth)}</dd>
                  </div>
                  <div className={`flex justify-between gap-4 ${dash.rowDivider}`}>
                    <dt className={dash.dt}>Roll / student ID</dt>
                    <dd className={`${dash.dd} font-mono`}>{viewStudent.rollNumber}</dd>
                  </div>
                  <div className={`flex justify-between gap-4 ${dash.rowDivider}`}>
                    <dt className={dash.dt}>Phone</dt>
                    <dd className={dash.dd}>{viewStudent.user.phone?.trim() || "—"}</dd>
                  </div>
                  <div className={`flex justify-between gap-4 ${dash.rowDivider}`}>
                    <dt className={dash.dt}>Email</dt>
                    <dd className={`${dash.dd} break-all`}>{viewStudent.user.email}</dd>
                  </div>
                  <div className={`flex justify-between gap-4 ${dash.rowDivider}`}>
                    <dt className={dash.dt}>Batch</dt>
                    <dd className={dash.dd}>{viewStudent.batch?.name ?? "—"}</dd>
                  </div>
                  <div className={`flex justify-between gap-4 ${dash.rowDivider}`}>
                    <dt className={dash.dt}>Section</dt>
                    <dd className={dash.dd}>{viewStudent.section?.name ?? "—"}</dd>
                  </div>
                  {viewStudent.parentName?.trim() ? (
                    <div className={`flex justify-between gap-4 ${dash.rowDivider}`}>
                      <dt className={dash.dt}>Parent Name</dt>
                      <dd className={dash.dd}>{viewStudent.parentName}</dd>
                    </div>
                  ) : null}
                  {viewStudent.parentPhone?.trim() ? (
                    <div className={`flex justify-between gap-4 ${dash.rowDivider}`}>
                      <dt className={dash.dt}>Parent Phone</dt>
                      <dd className={dash.dd}>{viewStudent.parentPhone}</dd>
                    </div>
                  ) : null}
                  {viewStudent.address?.trim() ? (
                    <div className={`flex justify-between gap-4 ${dash.rowDivider}`}>
                      <dt className={dash.dt}>Address</dt>
                      <dd className={dash.dd}>{viewStudent.address}</dd>
                    </div>
                  ) : null}
                  <div className={`flex justify-between gap-4 ${dash.rowDivider}`}>
                    <dt className={dash.dt}>Status</dt>
                    <dd className="text-right">
                      <span className={viewStudent.user.isActive ? dash.statusPillActive : dash.statusPillInactive}>
                        {viewStudent.user.isActive ? "Active" : "Inactive"}
                      </span>
                    </dd>
                  </div>
                </dl>
                <div>
                  <h3 className={`mb-2 text-xs font-semibold uppercase tracking-wide ${dash.dt}`}>
                    Today&apos;s schedule ({schedule.dayName})
                  </h3>
                  {schedule.slots.length === 0 ? (
                    <p className={`py-2 text-sm ${dash.cellMuted}`}>No classes scheduled for this day.</p>
                  ) : (
                    <ul className="space-y-2">
                      {schedule.slots.map((slot) => (
                        <li key={slot.id} className={dash.scheduleCard}>
                          <p className={`font-medium ${dash.cellStrong}`}>{slot.batchCourse.course.name}</p>
                          <p className={`text-xs ${dash.cellMuted}`}>
                            {slot.batchCourse.course.code} · Sec {slot.batchCourse.section?.name ?? "—"}
                          </p>
                          <p className={`mt-1 font-mono text-xs text-gray-600 dark:text-gray-400`}>
                            {slot.startTime} – {slot.endTime}
                            {slot.room ? ` · Room ${slot.room}` : ""}
                          </p>
                          {slot.batchCourse.faculty?.user && (
                            <p className={`mt-0.5 text-xs ${dash.cellMuted}`}>
                              {slot.batchCourse.faculty.user.firstName} {slot.batchCourse.faculty.user.lastName}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              );
            })()}
          </div>
        </div>
      )}

      {showForm && (
        <div className={dash.modalOverlay}>
          <div className={`${dash.modalPanel} ${dash.modalScroll} max-w-lg`}>
            <h2 className={`${dash.sectionTitle} mb-4`}>Add Student Profile</h2>
            {formError && <div className={dash.errorBanner}>{formError}</div>}
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className={dash.label}>Student User</label>
                <select value={form.userId} onChange={e => setForm(f => ({ ...f, userId: e.target.value }))} required
                  className={dash.selectFull}>
                  <option value="">Select student user</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>)}
                </select>
              </div>
              <div>
                <label className={dash.label}>Batch</label>
                <select value={form.batchId} onChange={e => setForm(f => ({ ...f, batchId: e.target.value }))} required
                  className={dash.selectFull}>
                  <option value="">Select batch</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className={dash.label}>Section</label>
                <select value={form.sectionId} onChange={e => setForm(f => ({ ...f, sectionId: e.target.value }))} required
                  disabled={!form.batchId}
                  className={dash.selectFullDisabled}>
                  <option value="">{form.batchId ? "Select section" : "Select a batch first"}</option>
                  {formSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className={dash.label}>Roll Number</label>
                <input value={form.rollNumber} onChange={e => setForm(f => ({ ...f, rollNumber: e.target.value }))} required
                  className={dash.input} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={dash.label}>Parent Name</label>
                  <input value={form.parentName} onChange={e => setForm(f => ({ ...f, parentName: e.target.value }))}
                    className={dash.input} />
                </div>
                <div>
                  <label className={dash.label}>Parent Phone</label>
                  <input value={form.parentPhone} onChange={e => setForm(f => ({ ...f, parentPhone: e.target.value }))}
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
