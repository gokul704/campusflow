import { prisma, AttendanceStatus } from "@campusflow/db";
import { resolveBatchCourseId } from "../../lib/bulkImportResolvers";

export async function getAttendance(
  tenantId: string,
  filters: { batchCourseId?: string; studentId?: string; startDate?: string; endDate?: string }
) {
  const dateFilter: Record<string, Date> = {};
  if (filters.startDate) dateFilter.gte = new Date(filters.startDate);
  if (filters.endDate) dateFilter.lte = new Date(filters.endDate);

  return prisma.attendance.findMany({
    where: {
      tenantId,
      ...(filters.batchCourseId ? { batchCourseId: filters.batchCourseId } : {}),
      ...(filters.studentId ? { studentId: filters.studentId } : {}),
      ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
    },
    include: {
      student: {
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      },
      batchCourse: {
        include: {
          course: { select: { name: true, code: true } },
        },
      },
    },
    orderBy: [{ date: "desc" }],
  });
}

export async function bulkMarkAttendance(
  tenantId: string,
  batchCourseId: string,
  date: string,
  records: Array<{ studentId: string; status: AttendanceStatus }>
) {
  const dateObj = new Date(date);
  const results = await Promise.all(
    records.map((record) =>
      prisma.attendance.upsert({
        where: {
          studentId_batchCourseId_date: {
            studentId: record.studentId,
            batchCourseId,
            date: dateObj,
          },
        },
        create: {
          tenantId,
          studentId: record.studentId,
          batchCourseId,
          date: dateObj,
          status: record.status,
        },
        update: { status: record.status },
      })
    )
  );
  return results;
}

export async function getAttendanceSummary(tenantId: string, batchCourseId: string) {
  const records = await prisma.attendance.findMany({
    where: { tenantId, batchCourseId },
    include: {
      student: {
        include: {
          user: { select: { firstName: true, lastName: true } },
          section: { select: { name: true } },
        },
      },
    },
  });

  const summaryMap = new Map<
    string,
    {
      studentId: string;
      studentName: string;
      rollNumber: string;
      present: number;
      absent: number;
      late: number;
      excused: number;
      total: number;
    }
  >();

  for (const record of records) {
    if (!summaryMap.has(record.studentId)) {
      summaryMap.set(record.studentId, {
        studentId: record.studentId,
        studentName: `${record.student.user.firstName} ${record.student.user.lastName}`,
        rollNumber: record.student.rollNumber,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        total: 0,
      });
    }

    const entry = summaryMap.get(record.studentId)!;
    entry.total += 1;
    if (record.status === "PRESENT") entry.present += 1;
    else if (record.status === "ABSENT") entry.absent += 1;
    else if (record.status === "LATE") entry.late += 1;
    else if (record.status === "EXCUSED") entry.excused += 1;
  }

  return Array.from(summaryMap.values()).map((entry) => ({
    ...entry,
    percentage: entry.total > 0 ? Math.round(((entry.present + entry.late) / entry.total) * 100) : 0,
  }));
}

export async function deleteAttendance(tenantId: string, id: string) {
  const record = await prisma.attendance.findFirst({ where: { id, tenantId } });
  if (!record) throw new Error("Attendance record not found");
  return prisma.attendance.delete({ where: { id } });
}

function parseAttendanceStatus(raw: string): AttendanceStatus {
  const u = raw.trim().toUpperCase();
  if (u === "PRESENT" || u === "ABSENT" || u === "LATE" || u === "EXCUSED") return u;
  throw new Error(`Invalid status: ${raw} (use PRESENT, ABSENT, LATE, or EXCUSED)`);
}

export async function bulkImportAttendanceRows(
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
    date: string;
    rollNumber?: string | null;
    studentEmail?: string | null;
    status: string;
  }>
) {
  const failed: { index: number; error: string }[] = [];
  let created = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    try {
      const batchCourseId = await resolveBatchCourseId(tenantId, row);
      const dateObj = new Date(row.date);
      if (Number.isNaN(dateObj.getTime())) throw new Error("Invalid date");
      const status = parseAttendanceStatus(row.status);

      const roll = row.rollNumber?.trim();
      const email = row.studentEmail?.trim().toLowerCase();
      let studentId: string | null = null;
      if (roll) {
        const s = await prisma.student.findUnique({
          where: { tenantId_rollNumber: { tenantId, rollNumber: roll } },
          select: { id: true },
        });
        studentId = s?.id ?? null;
      }
      if (!studentId && email) {
        const s = await prisma.student.findFirst({
          where: { tenantId, user: { email: { equals: email, mode: "insensitive" } } },
          select: { id: true },
        });
        studentId = s?.id ?? null;
      }
      if (!studentId) throw new Error("Student not found (use roll number or student email)");

      await prisma.attendance.upsert({
        where: {
          studentId_batchCourseId_date: {
            studentId,
            batchCourseId,
            date: dateObj,
          },
        },
        create: { tenantId, studentId, batchCourseId, date: dateObj, status },
        update: { status },
      });
      created++;
    } catch (e) {
      failed.push({ index: i, error: e instanceof Error ? e.message : "Failed" });
    }
  }
  return { created, failed };
}
