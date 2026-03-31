import { prisma } from "@campusflow/db";

export async function listExamGrades(
  tenantId: string,
  filters: { batchCourseId?: string; studentId?: string }
) {
  return prisma.examGrade.findMany({
    where: {
      tenantId,
      ...(filters.batchCourseId ? { batchCourseId: filters.batchCourseId } : {}),
      ...(filters.studentId ? { studentId: filters.studentId } : {}),
    },
    include: {
      student: {
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
      },
      batchCourse: {
        include: {
          course: { select: { name: true, code: true } },
        },
      },
    },
    orderBy: [{ batchCourseId: "asc" }, { examType: "asc" }],
  });
}

export async function upsertExamGrade(
  tenantId: string,
  data: {
    studentId: string;
    batchCourseId: string;
    examType: string;
    marks: number;
    maxMarks?: number;
    remarks?: string;
  }
) {
  return prisma.examGrade.upsert({
    where: {
      studentId_batchCourseId_examType: {
        studentId: data.studentId,
        batchCourseId: data.batchCourseId,
        examType: data.examType,
      },
    },
    create: {
      tenantId,
      studentId: data.studentId,
      batchCourseId: data.batchCourseId,
      examType: data.examType,
      marks: data.marks,
      maxMarks: data.maxMarks ?? 100,
      remarks: data.remarks,
    },
    update: {
      marks: data.marks,
      ...(data.maxMarks !== undefined ? { maxMarks: data.maxMarks } : {}),
      ...(data.remarks !== undefined ? { remarks: data.remarks } : {}),
    },
    include: {
      student: {
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
      },
      batchCourse: {
        include: {
          course: { select: { name: true, code: true } },
        },
      },
    },
  });
}

export async function deleteExamGrade(tenantId: string, id: string) {
  const record = await prisma.examGrade.findFirst({ where: { id, tenantId } });
  if (!record) throw new Error("Exam grade not found");
  return prisma.examGrade.delete({ where: { id } });
}
