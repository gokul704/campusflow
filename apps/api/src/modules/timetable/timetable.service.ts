import { prisma } from "@campusflow/db";
import { resolveBatchCourseId } from "../../lib/bulkImportResolvers";

const timetableInclude = {
  batchCourse: {
    include: {
      batch: { select: { name: true } },
      course: { select: { name: true, code: true } },
      faculty: { include: { user: { select: { firstName: true, lastName: true } } } },
    },
  },
};

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

/** Timetable uses 0=Mon … 5=Sat (see schema). Returns null on Sunday. */
export function timetableDayFromDate(d = new Date()): number | null {
  const js = d.getDay();
  if (js === 0) return null;
  return js - 1;
}

export function timetableDayLabel(d = new Date()): string {
  const js = d.getDay();
  if (js === 0) return "Sunday";
  return DAY_NAMES[js - 1] ?? "Unknown";
}

export async function listTodaysSlotsForStudent(tenantId: string, studentId: string, refDate = new Date()) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, tenantId },
    select: { id: true, batchId: true },
  });
  if (!student) throw new Error("Student not found");

  const dow = timetableDayFromDate(refDate);
  if (dow === null) {
    return { dayName: timetableDayLabel(refDate), slots: [] };
  }

  const batchCourses = await prisma.batchCourse.findMany({
    where: { tenantId, batchId: student.batchId },
    select: { id: true },
  });
  const ids = batchCourses.map((b: { id: string }) => b.id);
  if (ids.length === 0) {
    return { dayName: DAY_NAMES[dow], slots: [] };
  }

  const slots = await prisma.timetable.findMany({
    where: { tenantId, dayOfWeek: dow, batchCourseId: { in: ids } },
    include: timetableInclude,
    orderBy: { startTime: "asc" },
  });

  return { dayName: DAY_NAMES[dow], slots };
}

export async function listTodaysSlotsForFaculty(tenantId: string, facultyId: string, refDate = new Date()) {
  const dow = timetableDayFromDate(refDate);
  if (dow === null) {
    return { dayName: timetableDayLabel(refDate), slots: [] };
  }

  const slots = await prisma.timetable.findMany({
    where: { tenantId, dayOfWeek: dow, batchCourse: { facultyId } },
    include: timetableInclude,
    orderBy: { startTime: "asc" },
  });

  return { dayName: DAY_NAMES[dow], slots };
}

export async function listTimetable(
  tenantId: string,
  filters: { batchId?: string; batchCourseId?: string; facultyId?: string }
) {
  return prisma.timetable.findMany({
    where: {
      tenantId,
      ...(filters.batchCourseId ? { batchCourseId: filters.batchCourseId } : {}),
      ...(filters.batchId || filters.facultyId
        ? {
            batchCourse: {
              ...(filters.batchId ? { batchId: filters.batchId } : {}),
              ...(filters.facultyId ? { facultyId: filters.facultyId } : {}),
            },
          }
        : {}),
    },
    include: timetableInclude,
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
}

export async function createSlot(
  tenantId: string,
  data: { batchCourseId: string; dayOfWeek: number; startTime: string; endTime: string; room?: string }
) {
  return prisma.timetable.create({
    data: { tenantId, ...data },
    include: timetableInclude,
  });
}

export async function updateSlot(
  tenantId: string,
  id: string,
  data: { dayOfWeek?: number; startTime?: string; endTime?: string; room?: string | null }
) {
  const record = await prisma.timetable.findFirst({ where: { id, tenantId } });
  if (!record) throw new Error("Timetable slot not found");
  return prisma.timetable.update({
    where: { id },
    data,
    include: timetableInclude,
  });
}

export async function deleteSlot(tenantId: string, id: string) {
  const record = await prisma.timetable.findFirst({ where: { id, tenantId } });
  if (!record) throw new Error("Timetable slot not found");
  return prisma.timetable.delete({ where: { id } });
}

/** Schema uses 0=Monday … 5=Saturday. */
export function parseDayOfWeekInput(v: unknown): number {
  if (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 5) return v;
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) throw new Error("dayOfWeek is required");
  const map: Record<string, number> = {
    "0": 0,
    mon: 0,
    monday: 0,
    "1": 1,
    tue: 1,
    tues: 1,
    tuesday: 1,
    "2": 2,
    wed: 2,
    weds: 2,
    wednesday: 2,
    "3": 3,
    thu: 3,
    thur: 3,
    thurs: 3,
    thursday: 3,
    "4": 4,
    fri: 4,
    friday: 4,
    "5": 5,
    sat: 5,
    saturday: 5,
  };
  if (map[s] !== undefined) return map[s];
  const n = parseInt(s, 10);
  if (!Number.isNaN(n) && n >= 0 && n <= 5) return n;
  throw new Error(`Invalid day of week: ${String(v)} (use 0–5 with 0=Monday, or Monday–Saturday)`);
}

export async function bulkCreateTimetableSlots(
  tenantId: string,
  rows: Array<{
    batchCourseId?: string | null;
    batchId?: string | null;
    sectionId?: string | null;
    batchName?: string | null;
    sectionName?: string | null;
    courseCode?: string | null;
    courseId?: string | null;
    semester?: number | null;
    dayOfWeek: unknown;
    startTime: string;
    endTime: string;
    room?: string | null;
  }>
) {
  const failed: { index: number; error: string }[] = [];
  let created = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    try {
      const batchCourseId = await resolveBatchCourseId(tenantId, row);
      const dayOfWeek = parseDayOfWeekInput(row.dayOfWeek);
      const startTime = row.startTime.trim();
      const endTime = row.endTime.trim();
      if (!startTime || !endTime) throw new Error("startTime and endTime are required");
      await createSlot(tenantId, {
        batchCourseId,
        dayOfWeek,
        startTime,
        endTime,
        room: row.room?.trim() || undefined,
      });
      created++;
    } catch (e) {
      failed.push({ index: i, error: e instanceof Error ? e.message : "Failed" });
    }
  }
  return { created, failed };
}
