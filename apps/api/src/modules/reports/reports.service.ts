import { prisma } from "@campusflow/db";

export async function attendanceReport(tenantId: string, batchCourseId: string) {
  const batchCourse = await prisma.batchCourse.findFirst({
    where: { id: batchCourseId, tenantId },
    include: {
      section: { select: { id: true, name: true } },
    },
  });
  if (!batchCourse) throw new Error("BatchCourse not found");

  const students = await prisma.student.findMany({
    where: { tenantId, sectionId: batchCourse.sectionId },
    include: {
      user: { select: { firstName: true, lastName: true } },
    },
    orderBy: { rollNumber: "asc" },
  });

  const attendances = await prisma.attendance.findMany({
    where: { tenantId, batchCourseId },
  });

  const attendanceMap = new Map<string, { present: number; absent: number; late: number; excused: number; total: number }>();

  for (const a of attendances) {
    if (!attendanceMap.has(a.studentId)) {
      attendanceMap.set(a.studentId, { present: 0, absent: 0, late: 0, excused: 0, total: 0 });
    }
    const entry = attendanceMap.get(a.studentId)!;
    entry.total += 1;
    if (a.status === "PRESENT") entry.present += 1;
    else if (a.status === "ABSENT") entry.absent += 1;
    else if (a.status === "LATE") entry.late += 1;
    else if (a.status === "EXCUSED") entry.excused += 1;
  }

  return students.map((student: { id: string; rollNumber: string; user: { firstName: string; lastName: string } }) => {
    const stats = attendanceMap.get(student.id) ?? { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
    return {
      rollNumber: student.rollNumber,
      name: `${student.user.firstName} ${student.user.lastName}`,
      ...stats,
      percentage: stats.total > 0 ? Math.round(((stats.present + stats.late) / stats.total) * 100) : 0,
    };
  });
}

export async function gradeReport(tenantId: string, batchCourseId: string) {
  const batchCourse = await prisma.batchCourse.findFirst({
    where: { id: batchCourseId, tenantId },
  });
  if (!batchCourse) throw new Error("BatchCourse not found");

  const assignments = await prisma.assignment.findMany({
    where: { tenantId, batchCourseId },
    include: {
      submissions: {
        include: {
          assignment: false,
        },
      },
    },
  });

  const examGrades = await prisma.examGrade.findMany({
    where: { tenantId, batchCourseId },
    include: {
      student: {
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  return { assignments, examGrades };
}

export async function feeReport(tenantId: string) {
  const totalStudents = await prisma.student.count({ where: { tenantId } });
  const totalStructures = await prisma.feeStructure.count({ where: { tenantId } });

  const paidPayments = await prisma.feePayment.aggregate({
    where: { tenantId, status: "PAID" },
    _sum: { amount: true },
    _count: { id: true },
  });

  const pendingCount = await prisma.feePayment.count({ where: { tenantId, status: "PENDING" } });
  const failedCount = await prisma.feePayment.count({ where: { tenantId, status: "FAILED" } });
  const refundedCount = await prisma.feePayment.count({ where: { tenantId, status: "REFUNDED" } });

  const structures = await prisma.feeStructure.findMany({
    where: { tenantId },
    include: {
      _count: { select: { payments: true } },
      payments: {
        where: { status: "PAID" },
        select: { amount: true },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  const structureSummary = structures.map((s: { id: string; name: string; amount: number; dueDate: Date | null; _count: { payments: number }; payments: { amount: number }[] }) => ({
    id: s.id,
    name: s.name,
    amount: s.amount,
    dueDate: s.dueDate,
    totalPayments: s._count.payments,
    paidCount: s.payments.length,
    paidAmount: s.payments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0),
  }));

  return {
    totalStudents,
    totalStructures,
    totalPaidAmount: paidPayments._sum.amount ?? 0,
    paidPaymentsCount: paidPayments._count.id,
    pendingCount,
    failedCount,
    refundedCount,
    structures: structureSummary,
  };
}
