import * as XLSX from "xlsx";

export function normHeader(s: string) {
  return String(s).toLowerCase().replace(/[\s_-]/g, "");
}

export function excelCell(row: Record<string, unknown>, ...headerAliases: string[]): string {
  const targets = headerAliases.map(normHeader);
  for (const [k, v] of Object.entries(row)) {
    if (targets.includes(normHeader(String(k)))) return String(v ?? "").trim();
  }
  return "";
}

/** First sheet as objects; header row = first row. */
export async function readExcelFirstSheet(file: File): Promise<Record<string, unknown>[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0] ?? ""];
  if (!sheet) throw new Error("Workbook has no sheets.");
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
}

export function downloadExcelTemplate(filename: string, sheetName: string, headers: string[]) {
  const ws = XLSX.utils.aoa_to_sheet([headers, Array(headers.length).fill("")]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, filename);
}

/** Best-effort date from Excel (serial number, Date, or ISO-like string). */
export function excelDateToYmd(v: unknown): string {
  if (v == null || v === "") return "";
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    const parsed = XLSX.SSF?.parse_date_code?.(v);
    if (parsed && parsed.y != null && parsed.m != null && parsed.d != null) {
      return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
    }
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1]!;
  return s;
}

/**
 * Course / paper codes from prospectuses (e.g. "B 4.1 ", "B2.1 M") — trim, uppercase, remove spaces for a stable code key.
 */
export function normalizeCourseCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

const MONTH_ALIASES: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  feburary: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

function expandTwoDigitYear(y: number): number {
  if (y >= 100) return y;
  if (y <= 50) return 2000 + y;
  return 1900 + y;
}

function resolveMonthIndex(word: string): number {
  const w = word.toLowerCase().replace(/\./g, "").trim();
  if (MONTH_ALIASES[w] !== undefined) return MONTH_ALIASES[w]!;
  for (const [k, idx] of Object.entries(MONTH_ALIASES)) {
    if (w.startsWith(k) || k.startsWith(w)) return idx;
  }
  return -1;
}

function isValidYmd(y: number, m: number, d: number): boolean {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function toYmd(y: number, m: number, d: number): string {
  if (!isValidYmd(y, m, d)) return "";
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Monday that starts the Nth "week" of a calendar month (1-based), UTC. */
function ymdNthWeekMondayOfMonth(year: number, monthIndex: number, weekNum: number): string {
  if (weekNum < 1) return "";
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const dow = first.getUTCDay();
  const daysUntilMon = dow === 0 ? 1 : dow === 1 ? 0 : 8 - dow;
  const firstMonday = 1 + daysUntilMon;
  const dom = firstMonday + (weekNum - 1) * 7;
  return toYmd(year, monthIndex + 1, dom);
}

function tryParseNumericDate(s: string): string {
  let m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (m) {
    const d = Number(m[1]);
    const mo = Number(m[2]);
    const y = Number(m[3]);
    return toYmd(y, mo, d);
  }
  m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2})$/);
  if (m) {
    const d = Number(m[1]);
    const mo = Number(m[2]);
    const y = expandTwoDigitYear(Number(m[3]));
    return toYmd(y, mo, d);
  }
  return "";
}

function tryParseOrdinalEnglish(s: string, defaultYear: number): string {
  const t = s.replace(/,/g, " ").replace(/\s+/g, " ").trim();
  const re = /^(\d{1,2})(?:st|nd|rd|th)\s+([a-z.]+)\s*(\d{4}|\d{2})?$/i;
  const m = t.match(re);
  if (!m) return "";
  const day = Number(m[1]);
  const monthWord = m[2]!;
  const mi = resolveMonthIndex(monthWord);
  if (mi < 0) return "";
  let year = defaultYear;
  if (m[3]) {
    const yv = Number(m[3]);
    year = yv < 100 ? expandTwoDigitYear(yv) : yv;
  }
  return toYmd(year, mi + 1, day);
}

function tryParseWeekPhrase(s: string, defaultYear: number): string {
  const t = s.replace(/,/g, " ").replace(/\s+/g, " ").trim();
  const re = /^(\d)(?:st|nd|rd|th)\s+week\s+of\s+([a-z.]+)(?:\s+(\d{4}|\d{2}))?$/i;
  const m = t.match(re);
  if (!m) return "";
  const weekNum = Number(m[1]);
  const mi = resolveMonthIndex(m[2]!);
  if (mi < 0) return "";
  let year = defaultYear;
  if (m[3]) {
    const yv = Number(m[3]);
    year = yv < 100 ? expandTwoDigitYear(yv) : yv;
  }
  return ymdNthWeekMondayOfMonth(year, mi, weekNum);
}

/**
 * Prospectus-friendly dates: DD.MM.YYYY, DD/MM/YY, 31.1.26, ranges (first date), ordinals (15th November 2025),
 * "2nd week of February 2026", Excel serials. Unknown text returns "".
 */
export function parseFlexibleDateToYmd(v: unknown, options?: { defaultYear?: number }): string {
  if (v == null || v === "") return "";
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    return excelDateToYmd(v);
  }
  let s = String(v).trim();
  if (!s) return "";
  s = s.replace(/\s+onwards.*$/i, "").trim();
  s = s.split(/\s+to\s+/i)[0]!.trim();
  s = s.split(/\s+[–-]\s+/)[0]!.trim();
  s = s.replace(/,/g, " ").replace(/\s+/g, " ").trim();

  const defaultYear = options?.defaultYear ?? new Date().getFullYear();

  const numeric = tryParseNumericDate(s);
  if (numeric) return numeric;

  const ord = tryParseOrdinalEnglish(s, defaultYear);
  if (ord) return ord;

  const week = tryParseWeekPhrase(s, defaultYear);
  if (week) return week;

  const isoish = excelDateToYmd(v);
  if (isoish && /^\d{4}-\d{2}-\d{2}$/.test(isoish)) return isoish;

  return "";
}

/** "Mrs.Haritha / Mrs.Archana" → first segment; split last token as surname when possible. */
export function namesFromFacultyDisplayCell(full: string): { firstName: string; lastName: string } {
  const segment = full.split("/")[0]!.trim().replace(/\s+/g, " ");
  if (!segment) return { firstName: "Faculty", lastName: "." };
  const noTitle = segment.replace(/^(Mrs?|Mr|Ms|Dr)\.?\s*/i, "").trim() || segment;
  const parts = noTitle.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: segment, lastName: "." };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "." };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1]! };
}

export function parseYesNoCell(raw: string): boolean | undefined {
  const u = raw.trim().toLowerCase();
  if (!u) return undefined;
  if (["y", "yes", "true", "1", "common"].includes(u)) return true;
  if (["n", "no", "false", "0"].includes(u)) return false;
  return undefined;
}

export function alertBulkImportSummary(
  created: number,
  failed: { index: number; error: string; email?: string }[]
) {
  if (failed.length === 0) return;
  const lines = failed
    .slice(0, 15)
    .map((f) => `Row ${f.index + 2}${f.email != null ? ` (${f.email})` : ""}: ${f.error}`)
    .join("\n");
  window.alert(`Imported ${created}. ${failed.length} row(s) failed:\n${lines}${failed.length > 15 ? "\n…" : ""}`);
}
