"use client";

import { useEffect, useState } from "react";
import { authFetch, formatApiError } from "@/lib/api";
import { BulkImportOrderHint } from "@/components/dashboard/BulkImportGuide";
import {
  alertBulkImportSummary,
  downloadExcelTemplate,
  excelCell,
  parseFlexibleDateToYmd,
  readExcelFirstSheet,
} from "@/lib/excelImport";
import { dash } from "@/lib/dashboardUi";

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  eventType: string;
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  EVENT: "border-blue-500",
  WORKSHOP: "border-purple-500",
  HOLIDAY: "border-green-500",
  EXAM: "border-red-500",
  ASSIGNMENT_DUE: "border-orange-500",
};

const EVENT_TYPE_BADGE: Record<string, string> = {
  EVENT: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  WORKSHOP: "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300",
  HOLIDAY: "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300",
  EXAM: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300",
  ASSIGNMENT_DUE: "bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300",
};

const EVENT_TYPES = ["EVENT", "WORKSHOP", "HOLIDAY", "EXAM", "ASSIGNMENT_DUE"];

type EventImportRow = {
  title: string;
  startDate: string;
  endDate?: string;
  eventType: string;
  description?: string;
};

function normalizeEventType(raw: string): string {
  const t = raw.trim().toUpperCase().replace(/\s+/g, "_");
  const ok = ["EVENT", "WORKSHOP", "HOLIDAY", "EXAM", "ASSIGNMENT_DUE"] as const;
  if ((ok as readonly string[]).includes(t)) return t;
  if (/ASSIGN|SUBMIT|DUE/i.test(raw)) return "ASSIGNMENT_DUE";
  if (/EXAM|EXAMINATION|PRACTICAL|INTERNAL/i.test(raw)) return "EXAM";
  if (/HOLIDAY|VACATION|REOPEN|RE-OPEN/i.test(raw)) return "HOLIDAY";
  if (/WORKSHOP|JOURNAL|CLUB/i.test(raw)) return "WORKSHOP";
  return "EVENT";
}

function eventRowFromExcel(r: Record<string, unknown>): EventImportRow | null {
  const title = excelCell(r, "title", "activity", "milestone", "item", "label");
  if (!title) return null;
  const startRaw = excelCell(r, "start date", "startdate", "date", "from", "day");
  const endRaw = excelCell(r, "end date", "enddate", "to");
  const yHint = new Date().getFullYear();
  const startDate = parseFlexibleDateToYmd(startRaw, { defaultYear: yHint });
  const endDate = endRaw ? parseFlexibleDateToYmd(endRaw, { defaultYear: yHint }) : "";
  const etRaw = excelCell(r, "event type", "eventtype", "type");
  const eventType = etRaw ? normalizeEventType(etRaw) : normalizeEventType(title);
  const description = excelCell(r, "description", "notes", "group", "cohort", "track") || undefined;
  return {
    title,
    startDate,
    ...(endDate ? { endDate } : {}),
    eventType,
    description,
  };
}

function formatMonthYear(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function formatDateRange(startDate: string, endDate?: string): string {
  const start = new Date(startDate).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  if (!endDate) return start;
  const end = new Date(endDate).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  return `${start} — ${end}`;
}

export default function EventsPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    eventType: "EVENT",
  });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const [showImport, setShowImport] = useState(false);
  const [importRows, setImportRows] = useState<EventImportRow[]>([]);
  const [importParseError, setImportParseError] = useState("");
  const [importSubmitError, setImportSubmitError] = useState("");
  const [importLoading, setImportLoading] = useState(false);

  async function fetchEvents() {
    setLoading(true);
    const res = await authFetch("/api/events");
    const data = await res.json();
    const list: CalendarEvent[] = Array.isArray(data) ? data : data.events ?? [];
    list.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    setEvents(list);
    setLoading(false);
  }

  useEffect(() => { fetchEvents(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);
    try {
      const body: Record<string, unknown> = {
        title: form.title,
        eventType: form.eventType,
        startDate: form.startDate,
      };
      if (form.description) body.description = form.description;
      if (form.endDate) body.endDate = form.endDate;
      const res = await authFetch("/api/events", { method: "POST", body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? "Failed to create event"); return; }
      setShowForm(false);
      setForm({ title: "", description: "", startDate: "", endDate: "", eventType: "EVENT" });
      fetchEvents();
    } catch { setFormError("Something went wrong"); }
    finally { setFormLoading(false); }
  }

  async function handleDelete(ev: CalendarEvent) {
    if (!confirm(`Delete event "${ev.title}"?`)) return;
    const res = await authFetch(`/api/events/${ev.id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); alert(d.error ?? "Failed to delete"); return; }
    fetchEvents();
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
      const rows: EventImportRow[] = [];
      for (const row of raw) {
        const parsed = eventRowFromExcel(row);
        if (!parsed) continue;
        if (!parsed.startDate) {
          setImportParseError(
            `Could not read a start date for "${parsed.title}". Use DD.MM.YYYY (e.g. 04.05.2026) or YYYY-MM-DD.`
          );
          return;
        }
        rows.push(parsed);
      }
      if (rows.length === 0) {
        setImportParseError("No data rows found (each row needs at least Title and a parseable start date).");
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
      const res = await authFetch("/api/events/bulk", {
        method: "POST",
        body: JSON.stringify({
          rows: importRows.map((r) => ({
            title: r.title.trim(),
            startDate: r.startDate,
            endDate: r.endDate?.trim() || null,
            eventType: r.eventType,
            description: r.description?.trim() || null,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setImportSubmitError(formatApiError(data));
        return;
      }
      setShowImport(false);
      void fetchEvents();
      alertBulkImportSummary(data.created ?? 0, data.failed ?? []);
    } catch {
      setImportSubmitError("Request failed");
    } finally {
      setImportLoading(false);
    }
  }

  const grouped: { monthLabel: string; events: CalendarEvent[] }[] = [];
  for (const ev of events) {
    const label = formatMonthYear(ev.startDate);
    const existing = grouped.find(g => g.monthLabel === label);
    if (existing) existing.events.push(ev);
    else grouped.push({ monthLabel: label, events: [ev] });
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className={dash.pageTitle}>Events & Calendar</h1>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              downloadExcelTemplate("academic-calendar-import.xlsx", "Calendar", [
                "Title",
                "Start date",
                "End date",
                "Event type",
                "Description",
              ])
            }
            className={dash.btnSecondary}
          >
            Download Excel template
          </button>
          <button type="button" onClick={openImport} className={dash.btnSecondary}>
            Import Excel
          </button>
          <button
            type="button"
            onClick={() => {
              setForm({ title: "", description: "", startDate: "", endDate: "", eventType: "EVENT" });
              setFormError("");
              setShowForm(true);
            }}
            className={dash.btnPrimary}
          >
            + Add Event
          </button>
        </div>
      </div>

      <p className="mb-4 max-w-3xl text-xs text-gray-500 dark:text-gray-400">
        Paste academic-calendar rows from your prospectus (e.g. M.Sc(Aud)). <strong>Start date</strong> accepts{" "}
        <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">29.10.2025</code>,{" "}
        <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">15.12.25</code>,{" "}
        <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">31.1.26</code>,{" "}
        <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">15th November</code> (year defaults to the current year if
        omitted), <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">2nd week of February 2026</code>, ISO dates, and Excel
        date cells. Ranges like <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">11.05.2026 to 14.05.2026</code> use the
        <strong>first</strong> date in the Start column — put the end date in <strong>End date</strong> when you split into two
        columns. Vague lines (&quot;1 week vacation&quot;) need a date you type yourself. <strong>Event type</strong> can be set or
        left blank (inferred from the title; Journal Club → WORKSHOP, reopen → HOLIDAY).
      </p>

      {loading ? (
        <div className={`py-12 text-center ${dash.cellMuted}`}>Loading...</div>
      ) : events.length === 0 ? (
        <div className={`py-12 text-center ${dash.cellMuted}`}>No events yet. Add one to get started.</div>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ monthLabel, events: monthEvents }) => (
            <div key={monthLabel}>
              <h2 className={`mb-3 text-sm font-semibold uppercase tracking-wide ${dash.dt}`}>{monthLabel}</h2>
              <div className="space-y-3">
                {monthEvents.map(ev => (
                  <div
                    key={ev.id}
                    className={`${dash.card} flex items-start justify-between gap-4 border-l-4 p-4 ${EVENT_TYPE_COLORS[ev.eventType] ?? "border-gray-300 dark:border-gray-600"}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <p className={`font-medium ${dash.cellStrong}`}>{ev.title}</p>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${EVENT_TYPE_BADGE[ev.eventType] ?? dash.badge}`}>
                          {ev.eventType.replace("_", " ")}
                        </span>
                      </div>
                      {ev.description && (
                        <p className={`mb-1 text-sm ${dash.cellMuted}`}>{ev.description}</p>
                      )}
                      <p className="text-xs text-gray-400 dark:text-gray-500">{formatDateRange(ev.startDate, ev.endDate)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(ev)}
                      className="mt-1 shrink-0 text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className={dash.modalOverlay}>
          <div className={`${dash.modalPanel} ${dash.modalScroll} max-w-lg`}>
            <h2 className={`${dash.sectionTitle} mb-4`}>Add Event</h2>
            {formError && <div className={dash.errorBanner}>{formError}</div>}
            <form onSubmit={handleCreate} className="space-y-3">
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
                <label className={dash.label}>Type</label>
                <select
                  value={form.eventType}
                  onChange={e => setForm(f => ({ ...f, eventType: e.target.value }))}
                  required
                  className={dash.selectFull}
                >
                  {EVENT_TYPES.map(t => (
                    <option key={t} value={t}>{t.replace("_", " ")}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={dash.label}>Start Date</label>
                  <input
                    type="datetime-local"
                    value={form.startDate}
                    onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    required
                    className={dash.input}
                  />
                </div>
                <div>
                  <label className={dash.label}>End Date (optional)</label>
                  <input
                    type="datetime-local"
                    value={form.endDate}
                    onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
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
                  {formLoading ? "Saving..." : "Add Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImport && (
        <div className={dash.modalOverlay}>
          <div className={`${dash.modalPanel} ${dash.modalScroll} max-w-lg`}>
            <h2 className={`${dash.sectionTitle} mb-4`}>Import calendar events</h2>
            <BulkImportOrderHint className="mb-3" />
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
