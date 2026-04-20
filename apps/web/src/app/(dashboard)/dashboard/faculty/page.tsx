"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { authFetch, formatApiError } from "@/lib/api";
import {
  alertBulkImportSummary,
  downloadExcelTemplate,
  excelCell,
  namesFromFacultyDisplayCell,
  readExcelFirstSheet,
} from "@/lib/excelImport";
import { BulkImportOrderHint } from "@/components/dashboard/BulkImportGuide";
import { dash } from "@/lib/dashboardUi";

interface FacultyMember {
  id: string;
  designation: string;
  qualification?: string;
  user: { firstName: string; lastName: string; email: string; phone?: string | null; dateOfBirth?: string | null; isActive: boolean };
  department: { name: string; code: string };
}

interface FacultyDetailSlot {
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

interface FacultyDetail extends FacultyMember {
  scheduleToday: { dayName: string; slots: FacultyDetailSlot[] };
}

function formatDob(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

interface Department { id: string; name: string; code: string; }
interface UserOption { id: string; firstName: string; lastName: string; email: string; }

type FacultyImportRow = {
  email: string;
  firstName: string;
  lastName: string;
  designation: string;
  phone?: string;
  qualification?: string;
  departmentCode?: string;
  departmentName?: string;
  departmentId?: string;
  password?: string;
};

function facultyRowFromExcel(r: Record<string, unknown>): FacultyImportRow | null {
  const email = excelCell(r, "email");
  if (!email) return null;
  let firstName = excelCell(r, "firstname", "first name", "first_name");
  let lastName = excelCell(r, "lastname", "last name", "last_name");
  const facultyCell = excelCell(r, "faculty", "faculty name", "teacher", "teacher name", "full name", "staff name");
  if ((!firstName || !lastName) && facultyCell) {
    const sp = namesFromFacultyDisplayCell(facultyCell);
    if (!firstName) firstName = sp.firstName;
    if (!lastName) lastName = sp.lastName;
  }
  return {
    email,
    firstName,
    lastName,
    designation: excelCell(r, "designation", "title", "role"),
    phone: excelCell(r, "phone", "mobile") || undefined,
    qualification: excelCell(r, "qualification", "degree") || undefined,
    departmentCode: excelCell(r, "departmentcode", "department code", "dept code") || undefined,
    departmentName: excelCell(r, "departmentname", "department name", "dept name") || undefined,
    departmentId: excelCell(r, "departmentid", "department id") || undefined,
    password: excelCell(r, "password") || undefined,
  };
}

export default function FacultyPage() {
  const searchParams = useSearchParams();
  const [faculty, setFaculty] = useState<FacultyMember[]>([]);
  const [total, setTotal] = useState(0);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filterDept, setFilterDept] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [form, setForm] = useState({ userId: "", departmentId: "", designation: "", qualification: "" });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const [showImport, setShowImport] = useState(false);
  const [importRows, setImportRows] = useState<FacultyImportRow[]>([]);
  const [importParseError, setImportParseError] = useState("");
  const [importSubmitError, setImportSubmitError] = useState("");
  const [importDefaultPassword, setImportDefaultPassword] = useState("");
  const [importLoading, setImportLoading] = useState(false);

  const [viewFaculty, setViewFaculty] = useState<FacultyDetail | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState("");

  async function openView(facultyId: string) {
    setViewFaculty(null);
    setViewError("");
    setViewLoading(true);
    try {
      const res = await authFetch(`/api/faculty/${facultyId}`);
      const data = await res.json();
      if (!res.ok) {
        setViewError(data.error ?? "Could not load faculty");
        return;
      }
      setViewFaculty(data as FacultyDetail);
    } catch {
      setViewError("Could not load faculty");
    } finally {
      setViewLoading(false);
    }
  }

  function closeView() {
    setViewFaculty(null);
    setViewError("");
    setViewLoading(false);
  }

  async function fetchFaculty() {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), limit: "20" });
    if (filterDept) p.set("departmentId", filterDept);
    if (search) p.set("search", search);
    const res = await authFetch(`/api/faculty?${p}`);
    const data = await res.json();
    setFaculty(data.faculty ?? []);
    setTotal(data.pagination?.total ?? 0);
    setLoading(false);
  }

  useEffect(() => {
    authFetch("/api/departments").then(r => r.json()).then(setDepartments);
  }, []);

  useEffect(() => {
    const s = searchParams.get("search");
    if (s) setSearch(s);
  }, [searchParams]);

  useEffect(() => { fetchFaculty(); }, [page, filterDept]);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchFaculty(); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  async function openForm() {
    const res = await authFetch("/api/users?role=OPERATIONS_LECTURER&limit=100");
    const data = await res.json();
    setUsers(data.users ?? []);
    setShowForm(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);
    try {
      const res = await authFetch("/api/faculty", { method: "POST", body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? "Failed"); return; }
      setShowForm(false);
      setForm({ userId: "", departmentId: "", designation: "", qualification: "" });
      fetchFaculty();
    } catch { setFormError("Something went wrong"); }
    finally { setFormLoading(false); }
  }

  function openImport() {
    setImportRows([]);
    setImportParseError("");
    setImportSubmitError("");
    setImportDefaultPassword("");
    setShowImport(true);
  }

  async function handleExcelFile(file: File) {
    setImportParseError("");
    try {
      const raw = await readExcelFirstSheet(file);
      const rows: FacultyImportRow[] = [];
      for (const row of raw) {
        const parsed = facultyRowFromExcel(row);
        if (!parsed) continue;
        if (!parsed.firstName || !parsed.lastName || !parsed.designation) {
          setImportParseError(
            "Each row needs Email, Designation, and either (First + Last name) or a Faculty / Teacher column (e.g. timetable-style names)."
          );
          return;
        }
        if (!parsed.departmentId && !parsed.departmentCode && !parsed.departmentName) {
          setImportParseError(`Add department (code, name, or id) for row with email ${parsed.email}.`);
          return;
        }
        rows.push(parsed);
      }
      if (rows.length === 0) {
        setImportParseError("No data rows found (need at least Email per row).");
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
      const body: { defaultPassword?: string; rows: FacultyImportRow[] } = { rows: importRows };
      if (importDefaultPassword.trim().length >= 8) body.defaultPassword = importDefaultPassword.trim();
      const res = await authFetch("/api/faculty/bulk", { method: "POST", body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setImportSubmitError(formatApiError(data));
        return;
      }
      setShowImport(false);
      void fetchFaculty();
      const failed = (data.failed as { index: number; email?: string; error: string }[] | undefined) ?? [];
      alertBulkImportSummary(data.created ?? 0, failed);
    } catch {
      setImportSubmitError("Request failed");
    } finally {
      setImportLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className={dash.pageTitle}>Faculty</h1>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              downloadExcelTemplate("faculty-import-template.xlsx", "Faculty", [
                "Email",
                "First Name",
                "Last Name",
                "Faculty",
                "Designation",
                "Department Code",
                "Qualification",
                "Phone",
                "Password",
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
            + Add Faculty Profile
          </button>
        </div>
      </div>

      <p className="mb-4 max-w-3xl text-xs text-gray-500 dark:text-gray-400">
        Excel import creates the login and faculty profile together. Leave password blank to use{" "}
        <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">DEFAULT_NEW_USER_PASSWORD</code> from the API .env (min 8
        characters), or set a default below.
      </p>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={dash.inputSearch}
        />
        <select
          value={filterDept}
          onChange={(e) => { setFilterDept(e.target.value); setPage(1); }}
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
              <th className={dash.th}>Name</th>
              <th className={dash.th}>Email</th>
              <th className={dash.th}>Department</th>
              <th className={dash.th}>Designation</th>
              <th className={dash.th}>Status</th>
              <th className={`${dash.th} w-24 text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody className={dash.tbodyDivide}>
            {loading ? (
              <tr><td colSpan={6} className={dash.emptyCell}>Loading...</td></tr>
            ) : faculty.length === 0 ? (
              <tr><td colSpan={6} className={dash.emptyCell}>No faculty found</td></tr>
            ) : faculty.map((f) => (
              <tr key={f.id} className={dash.rowHover}>
                <td className={`px-4 py-3 ${dash.cellStrong}`}>{f.user.firstName} {f.user.lastName}</td>
                <td className={`px-4 py-3 ${dash.cellMuted}`}>{f.user.email}</td>
                <td className={`px-4 py-3 ${dash.cellMuted}`}>{f.department?.name}</td>
                <td className={`px-4 py-3 ${dash.cellMuted}`}>{f.designation}</td>
                <td className="px-4 py-3">
                  <span className={f.user.isActive ? dash.statusPillActive : dash.statusPillInactive}>
                    {f.user.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button type="button" onClick={() => openView(f.id)} className={dash.link}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(viewLoading || viewFaculty || viewError) && (
        <div className={`${dash.modalOverlay} p-4`}>
          <div className={`${dash.modalPanel} ${dash.modalScroll} max-w-lg`}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className={dash.sectionTitle}>Faculty details</h2>
              <button type="button" onClick={closeView} className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                Close
              </button>
            </div>
            {viewLoading && <p className={`py-8 text-center text-sm ${dash.cellMuted}`}>Loading…</p>}
            {viewError && !viewLoading && <p className="py-4 text-sm text-red-600 dark:text-red-400">{viewError}</p>}
            {viewFaculty && !viewLoading && (() => {
              const schedule = viewFaculty.scheduleToday ?? { dayName: "Today", slots: [] as FacultyDetailSlot[] };
              return (
              <div className="space-y-4 text-sm">
                <dl className="grid grid-cols-1 gap-3">
                  <div className={`flex justify-between gap-4 ${dash.rowDivider}`}>
                    <dt className={dash.dt}>Name</dt>
                    <dd className={`${dash.dd} font-medium`}>{viewFaculty.user.firstName} {viewFaculty.user.lastName}</dd>
                  </div>
                  <div className={`flex justify-between gap-4 ${dash.rowDivider}`}>
                    <dt className={dash.dt}>Date of birth</dt>
                    <dd className={dash.dd}>{formatDob(viewFaculty.user.dateOfBirth)}</dd>
                  </div>
                  <div className={`flex justify-between gap-4 ${dash.rowDivider}`}>
                    <dt className={dash.dt}>Employee ID</dt>
                    <dd className={`${dash.dd} max-w-[60%] break-all font-mono text-xs`}>{viewFaculty.id}</dd>
                  </div>
                  <div className={`flex justify-between gap-4 ${dash.rowDivider}`}>
                    <dt className={dash.dt}>Phone</dt>
                    <dd className={dash.dd}>{viewFaculty.user.phone?.trim() || "—"}</dd>
                  </div>
                  <div className={`flex justify-between gap-4 ${dash.rowDivider}`}>
                    <dt className={dash.dt}>Email</dt>
                    <dd className={`${dash.dd} break-all`}>{viewFaculty.user.email}</dd>
                  </div>
                  <div className={`flex justify-between gap-4 ${dash.rowDivider}`}>
                    <dt className={dash.dt}>Department</dt>
                    <dd className={dash.dd}>{viewFaculty.department?.name} ({viewFaculty.department?.code})</dd>
                  </div>
                  <div className={`flex justify-between gap-4 ${dash.rowDivider}`}>
                    <dt className={dash.dt}>Designation</dt>
                    <dd className={dash.dd}>{viewFaculty.designation}</dd>
                  </div>
                  {viewFaculty.qualification?.trim() ? (
                    <div className={`flex justify-between gap-4 ${dash.rowDivider}`}>
                      <dt className={dash.dt}>Qualification</dt>
                      <dd className={dash.dd}>{viewFaculty.qualification}</dd>
                    </div>
                  ) : null}
                  <div className={`flex justify-between gap-4 ${dash.rowDivider}`}>
                    <dt className={dash.dt}>Status</dt>
                    <dd className="text-right">
                      <span className={viewFaculty.user.isActive ? dash.statusPillActive : dash.statusPillInactive}>
                        {viewFaculty.user.isActive ? "Active" : "Inactive"}
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
                            {slot.batchCourse.course.code} · {slot.batchCourse.batch.name} · Sec {slot.batchCourse.section?.name ?? "—"}
                          </p>
                          <p className="mt-1 font-mono text-xs text-gray-600 dark:text-gray-400">
                            {slot.startTime} – {slot.endTime}
                            {slot.room ? ` · Room ${slot.room}` : ""}
                          </p>
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
          <div className={`${dash.modalPanel} max-w-md`}>
            <h2 className={`${dash.sectionTitle} mb-4`}>Add Faculty Profile</h2>
            {formError && <div className={dash.errorBanner}>{formError}</div>}
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className={dash.label}>Faculty User</label>
                <select value={form.userId} onChange={e => setForm(f => ({ ...f, userId: e.target.value }))} required
                  className={dash.selectFull}>
                  <option value="">Select faculty user</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>)}
                </select>
              </div>
              <div>
                <label className={dash.label}>Department</label>
                <select value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))} required
                  className={dash.selectFull}>
                  <option value="">Select department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className={dash.label}>Designation</label>
                <input value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} required
                  placeholder="Assistant Professor"
                  className={dash.input} />
              </div>
              <div>
                <label className={dash.label}>Qualification</label>
                <input value={form.qualification} onChange={e => setForm(f => ({ ...f, qualification: e.target.value }))}
                  placeholder="M.Tech, PhD..."
                  className={dash.input} />
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

      {showImport && (
        <div className={dash.modalOverlay}>
          <div className={`${dash.modalPanel} max-w-lg`}>
            <h2 className={`${dash.sectionTitle} mb-4`}>Import faculty</h2>
            <BulkImportOrderHint className="mb-3" />
            <p className={`mb-3 text-xs ${dash.cellMuted}`}>
              Each row still needs an institutional <strong>Email</strong> (login). If the sheet only has timetable-style names, put them
              in the <strong>Faculty</strong> column — the first name before a co-teacher (<code className="rounded bg-gray-100 px-1 dark:bg-gray-800">/</code>) is used
              and split into first/last name when First/Last are blank.
            </p>
            {importParseError && <div className={dash.errorBanner}>{importParseError}</div>}
            {importSubmitError && <div className={dash.errorBanner}>{importSubmitError}</div>}
            <div className="mb-3">
              <label className={dash.label}>Default password (optional)</label>
              <input
                type="password"
                autoComplete="new-password"
                value={importDefaultPassword}
                onChange={(e) => setImportDefaultPassword(e.target.value)}
                placeholder="Min 8 chars if row has no Password"
                className={dash.input}
              />
            </div>
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
