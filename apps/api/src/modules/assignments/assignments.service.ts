import { prisma } from "@campusflow/db";

const assignmentInclude = {
  batchCourse: {
    include: {
      batch: { select: { name: true } },
      course: { select: { name: true, code: true } },
    },
  },
  _count: { select: { submissions: true } },
};

export async function listAssignments(
  tenantId: string,
  filters: { batchCourseId?: string; batchId?: string }
) {
  return prisma.assignment.findMany({
    where: {
      tenantId,
      ...(filters.batchCourseId ? { batchCourseId: filters.batchCourseId } : {}),
      ...(filters.batchId ? { batchCourse: { batchId: filters.batchId } } : {}),
    },
    include: assignmentInclude,
    orderBy: [{ dueDate: "asc" }],
  });
}

export async function getAssignment(tenantId: string, id: string) {
  const assignment = await prisma.assignment.findFirst({
    where: { id, tenantId },
    include: {
      batchCourse: {
        include: {
          batch: { select: { name: true } },
          course: { select: { name: true, code: true } },
        },
      },
      submissions: {
        include: {
          assignment: false,
        },
      },
      _count: { select: { submissions: true } },
    },
  });
  if (!assignment) throw new Error("Assignment not found");
  return assignment;
}

export async function createAssignment(
  tenantId: string,
  data: {
    batchCourseId: string;
    title: string;
    description?: string;
    dueDate: string;
    maxMarks?: number;
    fileUrl?: string;
  }
) {
  return prisma.assignment.create({
    data: {
      tenantId,
      batchCourseId: data.batchCourseId,
      title: data.title,
      description: data.description,
      dueDate: new Date(data.dueDate),
      maxMarks: data.maxMarks ?? 100,
      fileUrl: data.fileUrl,
    },
    include: assignmentInclude,
  });
}

export async function updateAssignment(
  tenantId: string,
  id: string,
  data: {
    title?: string;
    description?: string;
    dueDate?: string;
    maxMarks?: number;
    fileUrl?: string | null;
  }
) {
  const record = await prisma.assignment.findFirst({ where: { id, tenantId } });
  if (!record) throw new Error("Assignment not found");
  return prisma.assignment.update({
    where: { id },
    data: {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    },
    include: assignmentInclude,
  });
}

export async function deleteAssignment(tenantId: string, id: string) {
  const record = await prisma.assignment.findFirst({ where: { id, tenantId } });
  if (!record) throw new Error("Assignment not found");
  return prisma.assignment.delete({ where: { id } });
}

export async function submitAssignment(
  tenantId: string,
  assignmentId: string,
  studentId: string,
  data: { fileUrl?: string; remarks?: string }
) {
  const assignment = await prisma.assignment.findFirst({ where: { id: assignmentId, tenantId } });
  if (!assignment) throw new Error("Assignment not found");

  return prisma.submission.upsert({
    where: { assignmentId_studentId: { assignmentId, studentId } },
    create: { tenantId, assignmentId, studentId, ...data },
    update: { ...data, submittedAt: new Date() },
  });
}

export async function gradeSubmission(
  tenantId: string,
  assignmentId: string,
  studentId: string,
  marks: number,
  remarks?: string
) {
  const assignment = await prisma.assignment.findFirst({ where: { id: assignmentId, tenantId } });
  if (!assignment) throw new Error("Assignment not found");

  const submission = await prisma.submission.findUnique({
    where: { assignmentId_studentId: { assignmentId, studentId } },
  });
  if (!submission) throw new Error("Submission not found");

  return prisma.submission.update({
    where: { assignmentId_studentId: { assignmentId, studentId } },
    data: { marks, ...(remarks !== undefined ? { remarks } : {}) },
  });
}
