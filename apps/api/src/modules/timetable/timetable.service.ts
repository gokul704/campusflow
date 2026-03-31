import { prisma } from "@campusflow/db";

const timetableInclude = {
  batchCourse: {
    include: {
      batch: { select: { name: true } },
      section: { select: { name: true } },
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
  const student = await prisma.student.findFirst({ where: { id: studentId, tenantId } });
  if (!student) throw new Error("Student not found");

  const dow = timetableDayFromDate(refDate);
  if (dow === null) {
    return { dayName: timetableDayLabel(refDate), slots: [] };
  }

  const batchCourses = await prisma.batchCourse.findMany({
    where: { tenantId, sectionId: student.sectionId },
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
  filters: { batchId?: string; batchCourseId?: string }
) {
  return prisma.timetable.findMany({
    where: {
      tenantId,
      ...(filters.batchCourseId ? { batchCourseId: filters.batchCourseId } : {}),
      ...(filters.batchId ? { batchCourse: { batchId: filters.batchId } } : {}),
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
