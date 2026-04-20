"use client";

import { useEffect, useState } from "react";
import { authFetch, formatApiError } from "@/lib/api";
import {
  alertBulkImportSummary,
  downloadExcelTemplate,
  excelCell,
  normHeader,
  readExcelFirstSheet,
} from "@/lib/excelImport";
import { BulkImportOrderHint } from "@/components/dashboard/BulkImportGuide";
import { dash } from "@/lib/dashboardUi";

interface TimetableSlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room?: string;
  batchCourse: {
    batch: { name: string };
    course: { name: string; code: string };
    faculty?: { user: { firstName: string; lastName: string } };
  };
}

interface BatchItem { id: string; name: string; }

interface BatchCourseOption {
  id: string;
  semester: number;
  batch: { id: string; name: string };
  course: { name: string; code: string };
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function rawCell(row: Record<string, unknown>, ...aliases: string[]): unknown {
  const targets = aliases.map((a) => normHeader(a));
  for (const [k, v] of Object.entries(row)) {
    if (targets.includes(normHeader(String(k)))) return v;
  }
  return undefined;
}

function excelTimeCell(v: unknown): string {
  if (typeof v === "number" && Number.isFinite(v)) {
    const frac = v % 1;
    if (frac > 0 || (v > 0 && v < 1)) {
      const totalMinutes = Math.round(frac * 24 * 60);
      const h = Math.floor(totalMinutes / 60) % 24;
      const m = totalMinutes % 60;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
  }
  return String(v ?? "").trim();
}

type TimetableImportRow = {
  batchCourseId?: string;
  batchName?: string;
  sectionName?: string;
  courseCode?: string;
  courseId?: string;
  semester?: number;
  dayOfWeek: string | number;
  startTime: string;
  endTime: string;
  room?: string;
};

function timetableRowFromExcel(r: Record<string, unknown>): TimetableImportRow | null {
  const batchCourseId = excelCell(r, "batchcourseid", "batch course id", "batch_course_id");
  const batchName = excelCell(r, "batchname", "batch name", "batch") || undefined;
  const sectionName = excelCell(r, "sectionname", "section name", "section", "sec") || undefined;
  const courseCode = excelCell(r, "coursecode", "course code", "code") || undefined;
  const courseId = excelCell(r, "courseid", "course id") || undefined;
  const semRaw = excelCell(r, "semester", "sem");
  const semester = semRaw ? Number(semRaw) : undefined;
  const dayCell = rawCell(r, "dayofweek", "day", "dow", "weekday");
  const dayRaw =
    dayCell !== undefined && dayCell !== "" && dayCell != null ? dayCell : excelCell(r, "dayofweek", "day", "dow", "weekday");
  const dayOfWeek: string | number =
    typeof dayRaw === "number" || typeof dayRaw === "string" ? dayRaw : String(dayRaw ?? "");
  const startTime = excelTimeCell(rawCell(r, "start time", "starttime", "start"));
  const endTime = excelTimeCell(rawCell(r, "end time", "endtime", "end"));
  const room = excelCell(r, "room", "venue", "hall") || undefined;
  if (!batchCourseId && !batchName && !courseCode && !courseId) return null;
  return {
    batchCourseId: batchCourseId || undefined,
    batchName,
    sectionName,
    courseCode,
    courseId,
    semester: semester != null && Number.isFinite(semester) ? semester : undefined,
    dayOfWeek,
    startTime,
    endTime,
    room,
  };
}

export default function TimetablePage() {
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [batchCourses, setBatchCourses] = useState<BatchCourseOption[]>([]);
  const [filterBatchId, setFilterBatchId] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    batchCourseId: "",
    dayOfWeek: "0",
    startTime: "",
    endTime: "",
    room: "",
  });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const [showImport, setShowImport] = useState(false);
  const [importRows, setImportRows] = useState<TimetableImportRow[]>([]);
  const [importParseError, setImportParseError] = useState("");
  const [importSubmitError, setImportSubmitError] = useState("");
  const [importLoading, setImportLoading] = useState(false);

  async function fetchSlots() {
    setLoading(true);
    const res = await authFetch("/api/timetable");
    const data = await res.json();
    setSlots(Array.isArray(data) ? data : data.slots ?? []);
    setLoading(false);
  }

  useEffect(() => {
    authFetch("/api/batches").then(r => r.json()).then(d => setBatches(Array.isArray(d) ? d : []));
    fetchSlots();
  }, []);

  // When filterBatchId changes, fetch batch-courses for the form
  useEffect(() => {
    if (filterBatchId) {
      authFetch(`/api/batch-courses?batchId=${filterBatchId}`)
        .then(r => r.json())
        .then(d => setBatchCourses(Array.isArray(d) ? d : d.batchCourses ?? []));
    } else {
      setBatchCourses([]);
    }
  }, [filterBatchId]);

  // Fetch all batch-courses when form opens (for the form dropdown)
  async function openForm() {
    setForm({ batchCourseId: "", dayOfWeek: "0", startTime: "", endTime: "", room: "" });
    setFormError("");
    // Load all batch courses for the form if we have a batch filter
    if (filterBatchId) {
      const res = await authFetch(`/api/batch-courses?batchId=${filterBatchId}`);
      const d = await res.json();
      setBatchCourses(Array.isArray(d) ? d : d.batchCourses ?? []);
    } else {
      const res = await authFetch("/api/batch-courses");
      const d = await res.json();
      setBatchCourses(Array.isArray(d) ? d : d.batchCourses ?? []);
    }
    setShowForm(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);
    try {
      const body = {
        batchCourseId: form.batchCourseId,
        dayOfWeek: Number(form.dayOfWeek),
        startTime: form.startTime,
        endTime: form.endTime,
        room: form.room || undefined,
      };
      const res = await authFetch("/api/timetable", { method: "POST", body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? "Failed to create slot"); return; }
      setShowForm(false);
      fetchSlots();
    } catch { setFormError("Something went wrong"); }
    finally { setFormLoading(false); }
  }

  async function handleDelete(slot: TimetableSlot) {
    const label = `${slot.batchCourse.course.name} on ${DAYS[slot.dayOfWeek]} at ${slot.startTime}`;
    if (!confirm(`Delete timetable slot: ${label}?`)) return;
    const res = await authFetch(`/api/timetable/${slot.id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); alert(d.error ?? "Failed to delete"); return; }
    fetchSlots();
  }

  function openImport() {
    setImportRows([]);
    setImportParseError("");
    setImportSubmitError("");
    setShowImport(true);
  }

  async function handleExcelFile(file: File) {
    setImportParseError("");
    try {
      const raw = await readExcelFirstSheet(file);
      const rows: TimetableImportRow[] = [];
      for (const row of raw) {
        const parsed = timetableRowFromExcel(row);
        if (!parsed) continue;
        const byBc = !!parsed.batchCourseId;
        const byParts =
          parsed.batchName &&
          parsed.sectionName &&
          (parsed.courseCode || parsed.courseId) &&
          parsed.semester != null;
        if (!byBc && !byParts) {
          setImportParseError(
            "Each row needs either Batch Course ID, or (Batch Name + Section Name + Course Code + Semester)."
          );
          return;
        }
        const dowOk =
          parsed.dayOfWeek === 0 ||
          parsed.dayOfWeek === "0" ||
          (typeof parsed.dayOfWeek === "string" && parsed.dayOfWeek.trim() !== "") ||
          (typeof parsed.dayOfWeek === "number" && Number.isFinite(parsed.dayOfWeek));
        if (!dowOk) {
          setImportParseError("Each row needs Day of week (e.g. Monday or 0).");
          return;
        }
        if (!parsed.startTime || !parsed.endTime) {
          setImportParseError("Each row needs Start Time and End Time (HH:MM).");
          return;
        }
        rows.push(parsed);
      }
      if (rows.length === 0) {
        setImportParseError("No data rows found.");
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
      const res = await authFetch("/api/timetable/bulk", {
        method: "POST",
        body: JSON.stringify({
          rows: importRows.map((r) => ({
            batchCourseId: r.batchCourseId || null,
            batchName: r.batchName || null,
            sectionName: r.sectionName || null,
            courseCode: r.courseCode || null,
            courseId: r.courseId || null,
            semester: r.semester ?? null,
            dayOfWeek: r.dayOfWeek,
            startTime: r.startTime,
            endTime: r.endTime,
            room: r.room || null,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setImportSubmitError(formatApiError(data));
        return;
      }
      setShowImport(false);
      void fetchSlots();
      alertBulkImportSummary(data.created ?? 0, data.failed ?? []);
    } catch {
      setImportSubmitError("Request failed");
    } finally {
      setImportLoading(false);
    }
  }

  // Filter slots by selected batch
  const visibleSlots = filterBatchId
    ? slots.filter((s) => {
        const selectedBatch = batches.find((b) => b.id === filterBatchId);
        return selectedBatch ? s.batchCourse.batch.name === selectedBatch.name : true;
      })
    : slots;

  // Group by day of week
  const slotsByDay = DAYS.map((day, idx) => ({
    day,
    idx,
    slots: visibleSlots.filter(s => s.dayOfWeek === idx).sort((a, b) => a.startTime.localeCompare(b.startTime)),
  }));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className={dash.pageTitle}>Timetable</h1>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              downloadExcelTemplate("timetable-import-template.xlsx", "Timetable", [
                "Batch Name",
                "Section Name",
                "Course Code",
                "Semester",
                "Day of week",
                "Start Time",
                "End Time",
                "Room",
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
            + Add Slot
          </button>
        </div>
      </div>

      <div className="mb-4 flex gap-3">
        <select
          value={filterBatchId}
          onChange={e => setFilterBatchId(e.target.value)}
          className={dash.select}
        >
          <option value="">All Batches</option>
          {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className={`py-12 text-center ${dash.cellMuted}`}>Loading...</div>
      ) : (
        <div className="space-y-6">
          {slotsByDay.map(({ day, slots: daySlots }) => (
            <div key={day}>
              <h2 className={`mb-2 text-sm font-semibold uppercase tracking-wide ${dash.cellMuted}`}>{day}</h2>
              {daySlots.length === 0 ? (
                <div className={`${dash.card} px-4 py-4 text-sm ${dash.cellMuted}`}>No classes scheduled</div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {daySlots.map(slot => (
                    <div key={slot.id} className={`${dash.card} flex flex-col gap-1 border-l-4 border-blue-500 p-4`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className={`text-sm font-medium ${dash.cellStrong}`}>{slot.batchCourse.course.name}</p>
                          <p className={`text-xs ${dash.cellMuted}`}>{slot.batchCourse.course.code} · Batch: {slot.batchCourse.batch.name}</p>
                        </div>
                        <button type="button" onClick={() => handleDelete(slot)} className={`ml-2 shrink-0 ${dash.btnDanger}`}>
                          Delete
                        </button>
                      </div>
                      <div className={`mt-1 flex items-center gap-2 text-xs ${dash.cellMuted}`}>
                        <span className="font-mono">{slot.startTime} – {slot.endTime}</span>
                        {slot.room && <span className="rounded bg-gray-100 px-2 py-0.5 dark:bg-gray-800">Room: {slot.room}</span>}
                      </div>
                      {slot.batchCourse.faculty && (
                        <p className={`text-xs ${dash.cellMuted}`}>
                          {slot.batchCourse.faculty.user.firstName} {slot.batchCourse.faculty.user.lastName}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className={dash.modalOverlay}>
          <div className={`${dash.modalPanel} ${dash.modalScroll} max-h-[90vh] w-full max-w-lg`}>
            <h2 className={`${dash.sectionTitle} mb-4`}>Add Timetable Slot</h2>
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
                      {bc.batch.name} | {bc.course.name} Sem {bc.semester}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={dash.label}>Day</label>
                <select
                  value={form.dayOfWeek}
                  onChange={e => setForm(f => ({ ...f, dayOfWeek: e.target.value }))}
                  required
                  className={dash.selectFull}
                >
                  {DAYS.map((d, i) => <option key={i} value={String(i)}>{d}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={dash.label}>Start Time</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                    required
                    className={dash.input}
                  />
                </div>
                <div>
                  <label className={dash.label}>End Time</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                    required
                    className={dash.input}
                  />
                </div>
              </div>
              <div>
                <label className={dash.label}>Room (optional)</label>
                <input
                  type="text"
                  value={form.room}
                  onChange={e => setForm(f => ({ ...f, room: e.target.value }))}
                  placeholder="e.g. Room 101"
                  className={dash.input}
                />
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
                  {formLoading ? "Saving..." : "Add Slot"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImport && (
        <div className={dash.modalOverlay}>
          <div className={`${dash.modalPanel} ${dash.modalScroll} max-h-[90vh] w-full max-w-lg`}>
            <h2 className={`${dash.sectionTitle} mb-4`}>Import timetable slots</h2>
            <BulkImportOrderHint className="mb-3" />
            <p className={`mb-3 text-xs ${dash.cellMuted}`}>
              <strong>Day of week</strong>: Monday–Saturday or 0–5 (0 = Monday). Times as HH:MM (24h, e.g. 09:00–10:00). Prospectus{" "}
              <strong>grid timetables</strong> (day × time slots) are not read automatically — add <strong>one row per slot</strong>{" "}
              (same paper can repeat for each hour). Use a <strong>Batch Course ID</strong> column when batch/section codes are
              awkward; otherwise batch name + section + course code + semester must match the app.
            </p>
            {importParseError && <div className={dash.errorBanner}>{importParseError}</div>}
            {importSubmitError && <div className={dash.errorBanner}>{importSubmitError}</div>}
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
