import { prisma, AttendanceStatus } from "@campusflow/db";

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
