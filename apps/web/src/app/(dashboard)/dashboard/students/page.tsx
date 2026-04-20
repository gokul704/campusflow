"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import * as XLSX from "xlsx";
import { authFetch, formatApiError } from "@/lib/api";
import { BulkImportOrderHint } from "@/components/dashboard/BulkImportGuide";
import { dash } from "@/lib/dashboardUi";

/** Present-student user account with no `Student` row yet (same as Users tab). */
interface AccountWithoutProfile {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  portalAccessRestricted: boolean;
}

interface Student {
  id: string;
  rollNumber: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    dateOfBirth?: string | null;
    isActive: boolean;
    portalAccessRestricted?: boolean;
    portalRestrictionReason?: string | null;
  };
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

interface Batch {
  id: string;
  name: string;
}
interface Section {
  id: string;
  name: string;
}

function normHeader(s: string) {
  return String(s).toLowerCase().replace(/[\s_-]/g, "");
}

function excelCell(row: Record<string, unknown>, ...headerAliases: string[]): string {
  const targets = headerAliases.map(normHeader);
  for (const [k, v] of Object.entries(row)) {
    if (targets.includes(normHeader(String(k)))) return String(v ?? "").trim();
  }
  return "";
}

type BulkRow = {
  email: string;
  firstName: string;
  lastName: string;
  rollNumber: string;
  batchId?: string;
  sectionId?: string;
  batchName?: string;
  sectionName?: string;
  phone?: string;
  dateOfBirth?: string;
  parentName?: string;
  parentPhone?: string;
  address?: string;
  password?: string;
};

function rowFromExcel(r: Record<string, unknown>): BulkRow | null {
  const email = excelCell(r, "email");
  if (!email) return null;
  const batchId = excelCell(r, "batchid", "batch id", "batch_id");
  const sectionId = excelCell(r, "sectionid", "section id", "section_id");
  const batchName =
    excelCell(r, "batchname", "batch name", "batch", "programme", "program", "class", "cohort") || undefined;
  const sectionName =
    excelCell(r, "sectionname", "section name", "sec", "division", "group") || undefined;
  return {
    email,
    firstName: excelCell(r, "firstname", "first name", "first_name"),
    lastName: excelCell(r, "lastname", "last name", "last_name"),
    rollNumber: excelCell(r, "rollnumber", "roll", "roll_number", "roll no"),
    batchId: batchId || undefined,
    sectionId: sectionId || undefined,
    batchName,
    sectionName,
    phone: excelCell(r, "phone", "mobile") || undefined,
    dateOfBirth: excelCell(r, "dateofbirth", "dob", "date of birth", "date_of_birth") || undefined,
    parentName: excelCell(r, "parentname", "parent name", "parent_name") || undefined,
    parentPhone: excelCell(r, "parentphone", "parent phone", "parent_phone") || undefined,
    address: excelCell(r, "address") || undefined,
    password: excelCell(r, "password") || undefined,
  };
}

const PORTAL_MANAGERS = new Set(["ADMIN", "CMD", "PRINCIPAL"]);

function downloadStudentTemplate() {
  const headers = [
    "Email",
    "First Name",
    "Last Name",
    "Roll Number",
    "Batch Name",
    "Section Name",
    "Phone",
    "Date of birth",
    "Parent name",
    "Parent phone",
    "Address",
    "Password",
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, Array(headers.length).fill("")]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Students");
  XLSX.writeFile(wb, "students-import-template.xlsx");
}

export default function StudentsPage() {
  const searchParams = useSearchParams();
  const [students, setStudents] = useState<Student[]>([]);
  const [accountsWithoutProfile, setAccountsWithoutProfile] = useState<AccountWithoutProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [filterBatch, setFilterBatch] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const [formSections, setFormSections] = useState<Section[]>([]);
  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    phone: "",
    dateOfBirth: "",
    batchId: "",
    sectionId: "",
    rollNumber: "",
    parentName: "",
    parentPhone: "",
    address: "",
  });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  /** When completing a profile for an existing user from this list, email is read-only. */
  const [formEmailLocked, setFormEmailLocked] = useState(false);

  const [importRows, setImportRows] = useState<BulkRow[]>([]);
  const [importParseError, setImportParseError] = useState("");
  const [importDefaultPassword, setImportDefaultPassword] = useState("");
  const [importSubmitError, setImportSubmitError] = useState("");
  const [importLoading, setImportLoading] = useState(false);

  const [viewStudent, setViewStudent] = useState<StudentDetail | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState("");
  const [meRole, setMeRole] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [canCreateStudent, setCanCreateStudent] = useState(false);
  const [portalReasonDraft, setPortalReasonDraft] = useState("");
  const [portalBusy, setPortalBusy] = useState(false);
  const [portalErr, setPortalErr] = useState("");

  const canManagePortal = Boolean(meRole && PORTAL_MANAGERS.has(meRole));

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
    setPortalReasonDraft("");
    setPortalErr("");
  }

  async function applyPortalRestrict() {
    if (!viewStudent) return;
    const reason = portalReasonDraft.trim();
    if (reason.length < 5) {
      setPortalErr("Enter a clear message for the student (at least 5 characters).");
      return;
    }
    setPortalErr("");
    setPortalBusy(true);
    try {
      const res = await authFetch(`/api/students/${viewStudent.id}/portal-access`, {
        method: "POST",
        body: JSON.stringify({ action: "restrict", reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPortalErr(formatApiError(data));
        return;
      }
      setPortalReasonDraft("");
      await openView(viewStudent.id);
      void fetchStudents();
    } catch {
      setPortalErr("Request failed");
    } finally {
      setPortalBusy(false);
    }
  }

  async function applyPortalLift() {
    if (!viewStudent) return;
    setPortalErr("");
    setPortalBusy(true);
    try {
      const res = await authFetch(`/api/students/${viewStudent.id}/portal-access`, {
        method: "POST",
        body: JSON.stringify({ action: "lift" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPortalErr(formatApiError(data));
        return;
      }
      await openView(viewStudent.id);
      void fetchStudents();
    } catch {
      setPortalErr("Request failed");
    } finally {
      setPortalBusy(false);
    }
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
    setAccountsWithoutProfile(
      Array.isArray(data.accountsWithoutProfile) ? (data.accountsWithoutProfile as AccountWithoutProfile[]) : []
    );
    setTotal(data.pagination?.total ?? 0);
    setLoading(false);
  }

  useEffect(() => {
    authFetch("/api/batches")
      .then((r) => r.json())
      .then(setBatches);
  }, []);

  useEffect(() => {
    authFetch("/api/auth/me")
      .then((r) => r.json())
      .then((d: { user?: { role?: string; id?: string } }) => {
        setMeRole(d?.user?.role ?? null);
        setMyUserId(typeof d?.user?.id === "string" ? d.user.id : null);
      })
      .catch(() => {
        setMeRole(null);
        setMyUserId(null);
      });
  }, []);

  useEffect(() => {
    authFetch("/api/auth/permissions")
      .then((r) => r.json())
      .then((d: { modules?: { students?: { create?: boolean } } }) => {
        setCanCreateStudent(Boolean(d?.modules?.students?.create));
      })
      .catch(() => setCanCreateStudent(false));
  }, []);

  useEffect(() => {
    const s = searchParams.get("search");
    if (s) setSearch(s);
  }, [searchParams]);

  useEffect(() => {
    if (filterBatch) {
      authFetch(`/api/sections?batchId=${filterBatch}`)
        .then((r) => r.json())
        .then((d) => setSections(Array.isArray(d) ? d : []));
    } else {
      setSections([]);
    }
    setFilterSection("");
  }, [filterBatch]);

  useEffect(() => {
    void fetchStudents();
  }, [page, filterBatch, filterSection]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      void fetchStudents();
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (form.batchId) {
      authFetch(`/api/sections?batchId=${form.batchId}`)
        .then((r) => r.json())
        .then((d) => setFormSections(Array.isArray(d) ? d : []));
    } else {
      setFormSections([]);
    }
    setForm((f) => ({ ...f, sectionId: "" }));
  }, [form.batchId]);

  function openCreateForm() {
    setFormEmailLocked(false);
    setForm({
      email: "",
      firstName: "",
      lastName: "",
      password: "",
      phone: "",
      dateOfBirth: "",
      batchId: "",
      sectionId: "",
      rollNumber: "",
      parentName: "",
      parentPhone: "",
      address: "",
    });
    setFormError("");
    setShowForm(true);
  }

  function openCompleteProfile(a: AccountWithoutProfile) {
    setFormEmailLocked(true);
    setForm({
      email: a.email,
      firstName: a.firstName,
      lastName: a.lastName,
      password: "",
      phone: "",
      dateOfBirth: "",
      batchId: "",
      sectionId: "",
      rollNumber: "",
      parentName: "",
      parentPhone: "",
      address: "",
    });
    setFormError("");
    setShowForm(true);
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
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0] ?? ""];
      if (!sheet) {
        setImportParseError("Workbook has no sheets.");
        return;
      }
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const rows: BulkRow[] = [];
      for (const r of raw) {
        const parsed = rowFromExcel(r);
        if (!parsed) continue;
        const byId = parsed.batchId && parsed.sectionId;
        const byName = parsed.batchName && parsed.sectionName;
        if (!parsed.firstName || !parsed.lastName || !parsed.rollNumber || (!byId && !byName)) {
          setImportParseError(
            `Each data row needs Email, First Name, Last Name, Roll Number, and either (Batch Name + Section Name) or (Batch ID + Section ID). Check row for ${parsed.email || "(blank email)"}.`
          );
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);
    try {
      const body: Record<string, unknown> = {
        email: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        batchId: form.batchId,
        sectionId: form.sectionId,
        rollNumber: form.rollNumber.trim(),
        parentName: form.parentName.trim() || null,
        parentPhone: form.parentPhone.trim() || null,
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        dateOfBirth: form.dateOfBirth.trim() || null,
      };
      if (form.password.trim().length >= 8) body.password = form.password.trim();
      const res = await authFetch("/api/students", { method: "POST", body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(formatApiError(data));
        return;
      }
      setShowForm(false);
      setFormEmailLocked(false);
      void fetchStudents();
    } catch {
      setFormError("Something went wrong");
    } finally {
      setFormLoading(false);
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
      const body: { defaultPassword?: string; rows: BulkRow[] } = { rows: importRows };
      if (importDefaultPassword.trim().length >= 8) body.defaultPassword = importDefaultPassword.trim();
      const res = await authFetch("/api/students/bulk", { method: "POST", body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setImportSubmitError(formatApiError(data));
        return;
      }
      setShowImport(false);
      void fetchStudents();
      const failed = (data.failed as { index: number; email?: string; error: string }[] | undefined) ?? [];
      if (failed.length > 0) {
        alert(
          `Imported ${data.created ?? 0} students. ${failed.length} row(s) failed:\n` +
            failed.slice(0, 15).map((f) => `Row ${f.index + 2} (${f.email ?? "?"}): ${f.error}`).join("\n") +
            (failed.length > 15 ? "\n…" : "")
        );
      }
    } catch {
      setImportSubmitError("Request failed");
    } finally {
      setImportLoading(false);
    }
  }

  const showPendingRows = page === 1 && !filterBatch && !filterSection;

  const pendingRowsForTable = useMemo(() => {
    if (meRole === "PRESENT_STUDENT" && myUserId) {
      return accountsWithoutProfile.filter((a) => a.userId !== myUserId);
    }
    return accountsWithoutProfile;
  }, [accountsWithoutProfile, meRole, myUserId]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className={dash.pageTitle}>Students</h1>
        <div className="flex flex-wrap gap-2">
          {canCreateStudent && (
            <>
              <button type="button" onClick={downloadStudentTemplate} className={dash.btnSecondary}>
                Download Excel template
              </button>
              <button type="button" onClick={openImport} className={dash.btnSecondary}>
                Import Excel
              </button>
              <button type="button" onClick={openCreateForm} className={dash.btnPrimary}>
                + Add student
              </button>
            </>
          )}
        </div>
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
          onChange={(e) => {
            setFilterBatch(e.target.value);
            setPage(1);
          }}
          className={dash.select}
        >
          <option value="">All Batches</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        {filterBatch && (
          <select
            value={filterSection}
            onChange={(e) => {
              setFilterSection(e.target.value);
              setPage(1);
            }}
            className={dash.select}
          >
            <option value="">All Sections</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
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
              <tr>
                <td colSpan={7} className={dash.emptyCell}>
                  Loading...
                </td>
              </tr>
            ) : students.length === 0 && (!showPendingRows || pendingRowsForTable.length === 0) ? (
              <tr>
                <td colSpan={7} className={dash.emptyCell}>
                  No students found
                </td>
              </tr>
            ) : (
              <>
                {showPendingRows &&
                  pendingRowsForTable.map((a) => (
                    <tr
                      key={`pending-${a.userId}`}
                      className={`${dash.rowHover} bg-slate-50/90 dark:bg-slate-900/45`}
                    >
                      <td className={`px-4 py-3 ${dash.cellMono}`}>
                        <span className={dash.cellMuted}>&mdash;</span>
                      </td>
                      <td className={`px-4 py-3 ${dash.cellStrong}`}>
                        {a.firstName} {a.lastName}
                      </td>
                      <td className={`px-4 py-3 ${dash.cellMuted}`}>{a.email}</td>
                      <td className={`px-4 py-3 ${dash.cellMuted}`}>
                        <span className={dash.cellMuted}>&mdash;</span>
                      </td>
                      <td className={`px-4 py-3 ${dash.cellMuted}`}>
                        <span className={dash.cellMuted}>&mdash;</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-100">
                            No profile
                          </span>
                          <span className={a.isActive ? dash.statusPillActive : dash.statusPillInactive}>
                            {a.isActive ? "Active" : "Inactive"}
                          </span>
                          {a.portalAccessRestricted ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950/60 dark:text-amber-100">
                              Portal locked
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canCreateStudent ? (
                          <button type="button" onClick={() => openCompleteProfile(a)} className={dash.link}>
                            Complete profile
                          </button>
                        ) : (
                          <span className={`text-xs ${dash.cellMuted}`}>Office only</span>
                        )}
                      </td>
                    </tr>
                  ))}
                {students.map((s) => (
                  <tr key={s.id} className={dash.rowHover}>
                    <td className={`px-4 py-3 ${dash.cellMono}`}>{s.rollNumber}</td>
                    <td className={`px-4 py-3 ${dash.cellStrong}`}>
                      {s.user.firstName} {s.user.lastName}
                    </td>
                    <td className={`px-4 py-3 ${dash.cellMuted}`}>{s.user.email}</td>
                    <td className={`px-4 py-3 ${dash.cellMuted}`}>{s.batch?.name}</td>
                    <td className={`px-4 py-3 ${dash.cellMuted}`}>
                      {s.section?.name ? s.section.name : <span className={dash.emDash}>&mdash;</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <span className={s.user.isActive ? dash.statusPillActive : dash.statusPillInactive}>
                          {s.user.isActive ? "Active" : "Inactive"}
                        </span>
                        {s.user.portalAccessRestricted ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950/60 dark:text-amber-100">
                            Portal locked
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => openView(s.id)} className={dash.link}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
        {total > 20 && (
          <div className={dash.paginationBar}>
            <span>
              Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className={dash.paginationBtn}>
                Prev
              </button>
              <button
                type="button"
                disabled={page * 20 >= total}
                onClick={() => setPage((p) => p + 1)}
                className={dash.paginationBtn}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {(viewLoading || viewStudent || viewError) && (
        <div className={`${dash.modalOverlay} p-4`}>
          <div className={`${dash.modalPanel} ${dash.modalScroll} max-w-lg`}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className={dash.sectionTitle}>Student details</h2>
              <button
                type="button"
                onClick={closeStudentView}
                className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
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
                      <dd className={`${dash.dd} font-medium`}>
                        {viewStudent.user.firstName} {viewStudent.user.lastName}
                      </dd>
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
                  {canManagePortal && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
                      <h3 className={`text-xs font-semibold uppercase tracking-wide ${dash.dt}`}>Portal access (student)</h3>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        When restricted, the student can sign in but only sees the message below — no dashboard navigation.
                      </p>
                      {viewStudent.user.portalAccessRestricted ? (
                        <div className="mt-3 space-y-3">
                          <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                            <p className="text-xs font-semibold uppercase text-amber-800 dark:text-amber-200/90">Current message</p>
                            <p className="mt-1 whitespace-pre-wrap">
                              {viewStudent.user.portalRestrictionReason?.trim() || "—"}
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={portalBusy}
                            onClick={() => void applyPortalLift()}
                            className={`w-full ${dash.btnSecondary}`}
                          >
                            {portalBusy ? "Updating…" : "Lift portal restriction"}
                          </button>
                        </div>
                      ) : (
                        <div className="mt-3 space-y-2">
                          <label className={dash.label}>Message to show the student (required, min 5 characters)</label>
                          <textarea
                            value={portalReasonDraft}
                            onChange={(e) => setPortalReasonDraft(e.target.value)}
                            rows={4}
                            className={`${dash.input} min-h-[100px] resize-y`}
                            placeholder="e.g. Fee documents pending — visit the office with originals by Friday."
                          />
                          <button
                            type="button"
                            disabled={portalBusy}
                            onClick={() => void applyPortalRestrict()}
                            className={`w-full ${dash.btnPrimary}`}
                          >
                            {portalBusy ? "Saving…" : "Restrict portal access"}
                          </button>
                        </div>
                      )}
                      {portalErr ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{portalErr}</p> : null}
                    </div>
                  )}
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
            <h2 className={`${dash.sectionTitle} mb-4`}>
              {formEmailLocked ? "Complete student profile" : "Add student"}
            </h2>
            {formError && <div className={dash.errorBanner}>{formError}</div>}
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={dash.label}>First name</label>
                  <input
                    value={form.firstName}
                    onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                    required
                    className={dash.input}
                  />
                </div>
                <div>
                  <label className={dash.label}>Last name</label>
                  <input
                    value={form.lastName}
                    onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                    required
                    className={dash.input}
                  />
                </div>
              </div>
              <div>
                <label className={dash.label}>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                  readOnly={formEmailLocked}
                  className={`${dash.input} ${formEmailLocked ? "cursor-not-allowed bg-gray-100 dark:bg-gray-900/60" : ""}`}
                />
              </div>
              <div>
                <label className={dash.label}>Password (optional)</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Min 8 chars; else DEFAULT_NEW_USER_PASSWORD"
                  autoComplete="new-password"
                  className={dash.input}
                />
              </div>
              <div>
                <label className={dash.label}>Phone (optional)</label>
                <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={dash.input} />
              </div>
              <div>
                <label className={dash.label}>Date of birth (optional)</label>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                  className={dash.input}
                />
              </div>
              <div>
                <label className={dash.label}>Batch</label>
                <select
                  value={form.batchId}
                  onChange={(e) => setForm((f) => ({ ...f, batchId: e.target.value }))}
                  required
                  className={dash.selectFull}
                >
                  <option value="">Select batch</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={dash.label}>Section</label>
                <select
                  value={form.sectionId}
                  onChange={(e) => setForm((f) => ({ ...f, sectionId: e.target.value }))}
                  required
                  disabled={!form.batchId}
                  className={dash.selectFullDisabled}
                >
                  <option value="">{form.batchId ? "Select section" : "Select a batch first"}</option>
                  {formSections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={dash.label}>Roll number</label>
                <input
                  value={form.rollNumber}
                  onChange={(e) => setForm((f) => ({ ...f, rollNumber: e.target.value }))}
                  required
                  className={dash.input}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={dash.label}>Parent name</label>
                  <input value={form.parentName} onChange={(e) => setForm((f) => ({ ...f, parentName: e.target.value }))} className={dash.input} />
                </div>
                <div>
                  <label className={dash.label}>Parent phone</label>
                  <input value={form.parentPhone} onChange={(e) => setForm((f) => ({ ...f, parentPhone: e.target.value }))} className={dash.input} />
                </div>
              </div>
              <div>
                <label className={dash.label}>Address (optional)</label>
                <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className={dash.input} />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setFormEmailLocked(false);
                    setShowForm(false);
                  }}
                  className={`flex-1 ${dash.btnSecondary}`}
                >
                  Cancel
                </button>
                <button type="submit" disabled={formLoading} className={`flex-1 ${dash.btnPrimary}`}>
                  {formLoading ? "Saving…" : "Create student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImport && (
        <div className={dash.modalOverlay}>
          <div className={`${dash.modalPanel} ${dash.modalScroll} max-w-2xl`}>
            <h2 className={`${dash.sectionTitle} mb-4`}>Import students from Excel</h2>
            <BulkImportOrderHint className="mb-3" />
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
              Use the downloaded template. Each row needs Email, First Name, Last Name, Roll Number, <strong>Batch Name</strong>,{" "}
              <strong>Section Name</strong> (same text as in the app). Optional: Phone, Date of birth, Parent name, Parent phone,
              Address, Password. You can still use Batch ID + Section ID columns instead if you prefer.
            </p>
            {importParseError && <div className={dash.errorBanner}>{importParseError}</div>}
            {importSubmitError && <div className={dash.errorBanner}>{importSubmitError}</div>}
            <div className="space-y-3">
              <div>
                <label className={dash.label}>Excel file (.xlsx)</label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleExcelFile(f);
                  }}
                  className={dash.input}
                />
              </div>
              <div>
                <label className={dash.label}>Default password for all rows (optional if API .env is set)</label>
                <input
                  type="password"
                  value={importDefaultPassword}
                  onChange={(e) => setImportDefaultPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className={dash.input}
                />
              </div>
              {importRows.length > 0 && (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {importRows.length} row(s) ready. First: {importRows[0]?.email}
                </p>
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
        </div>
      )}
    </div>
  );
}
