import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { prisma, Role } from "@campusflow/db";
import { createNotification } from "../notifications/notifications.service";

const MAX_SUBMISSION_BYTES = 15 * 1024 * 1024;

const assignmentInclude = {
  batchCourse: {
    include: {
      batch: { select: { name: true } },
      course: { select: { name: true, code: true } },
    },
  },
  _count: { select: { submissions: true } },
};

const submissionStudentInclude = {
  student: {
    select: {
      id: true,
      rollNumber: true,
      user: { select: { firstName: true, lastName: true, id: true } },
    },
  },
};

function sanitizeFileName(raw: string): string {
  const base = path.basename(raw || "submission").replace(/[^\w.\-]+/g, "_");
  return base.slice(0, 120) || "submission";
}

async function writeSubmissionFile(
  tenantId: string,
  assignmentId: string,
  studentId: string,
  fileBase64: string,
  fileName: string
): Promise<string> {
  const buf = Buffer.from(fileBase64, "base64");
  if (buf.length > MAX_SUBMISSION_BYTES) {
    throw new Error("File too large (max 15MB)");
  }
  if (buf.length === 0) throw new Error("Empty file");
  const safe = sanitizeFileName(fileName);
  const unique = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${safe}`;
  const rel = path.join("assignment-submissions", tenantId, assignmentId, unique);
  const abs = path.resolve(process.cwd(), "uploads", rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, buf);
  return rel.replace(/\\/g, "/");
}

async function removeSubmissionFileIfExists(relPath: string | null | undefined) {
  if (!relPath?.trim()) return;
  const abs = path.resolve(process.cwd(), "uploads", relPath);
  try {
    await fs.unlink(abs);
  } catch {
    // ignore missing file
  }
}

async function writeAssignmentHandoutFile(
  tenantId: string,
  assignmentId: string,
  fileBase64: string,
  fileName: string
): Promise<string> {
  const buf = Buffer.from(fileBase64, "base64");
  if (buf.length > MAX_SUBMISSION_BYTES) {
    throw new Error("File too large (max 15MB)");
  }
  if (buf.length === 0) throw new Error("Empty file");
  const safe = sanitizeFileName(fileName);
  const unique = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${safe}`;
  const rel = path.join("assignment-handouts", tenantId, assignmentId, unique);
  const abs = path.resolve(process.cwd(), "uploads", rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, buf);
  return rel.replace(/\\/g, "/");
}

async function removeAssignmentHandoutIfExists(relPath: string | null | undefined) {
  if (!relPath?.trim()) return;
  const abs = path.resolve(process.cwd(), "uploads", relPath);
  try {
    await fs.unlink(abs);
  } catch {
    // ignore missing file
  }
}

async function notifyBatchStudentsNewAssignment(
  tenantId: string,
  batchId: string,
  assignmentId: string,
  title: string,
  dueDate: Date,
  courseLabel: string
) {
  const students = await prisma.student.findMany({
    where: { tenantId, batchId },
    select: { userId: true },
  });
  const dueStr = dueDate.toLocaleString();
  const link = `/dashboard/assignments?assignment=${assignmentId}`;
  const body = `${courseLabel}. Due: ${dueStr}. Open Assignments to upload your work.`;
  for (const s of students) {
    try {
      await createNotification(tenantId, s.userId, `New assignment: ${title}`, body, link);
    } catch {
      // continue other students
    }
  }
}

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

export async function listMyAssignments(tenantId: string, studentId: string) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, tenantId },
    select: { batchId: true },
  });
  if (!student) throw new Error("Student not found");

  return prisma.assignment.findMany({
    where: { tenantId, batchCourse: { batchId: student.batchId } },
    include: {
      batchCourse: {
        include: {
          batch: { select: { name: true } },
          course: { select: { name: true, code: true } },
        },
      },
      submissions: {
        where: { studentId },
        include: submissionStudentInclude,
      },
      _count: { select: { submissions: true } },
    },
    orderBy: [{ dueDate: "asc" }],
  });
}

export async function getAssignment(
  tenantId: string,
  id: string,
  opts?: { studentBatchId?: string; studentId?: string }
) {
  const assignment = await prisma.assignment.findFirst({
    where: { id, tenantId },
    include: {
      batchCourse: {
        include: {
          batch: { select: { id: true, name: true } },
          course: { select: { name: true, code: true } },
        },
      },
      submissions: {
        where: opts?.studentId ? { studentId: opts.studentId } : undefined,
        include: submissionStudentInclude,
      },
      _count: { select: { submissions: true } },
    },
  });
  if (!assignment) throw new Error("Assignment not found");
  if (opts?.studentBatchId && assignment.batchCourse.batch.id !== opts.studentBatchId) {
    throw new Error("Assignment not found");
  }
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
    fileBase64?: string;
    fileName?: string;
  }
) {
  const bc = await prisma.batchCourse.findFirst({
    where: { id: data.batchCourseId, tenantId },
    include: { batch: { select: { id: true, name: true } }, course: { select: { name: true, code: true } } },
  });
  if (!bc) throw new Error("Batch course not found");

  const created = await prisma.assignment.create({
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

  let out = created;
  if (data.fileBase64?.trim()) {
    const rel = await writeAssignmentHandoutFile(
      tenantId,
      created.id,
      data.fileBase64.trim(),
      data.fileName?.trim() || "handout"
    );
    out = await prisma.assignment.update({
      where: { id: created.id },
      data: { filePath: rel },
      include: assignmentInclude,
    });
  }

  const courseLabel = `${bc.course.name} (${bc.course.code}) — ${bc.batch.name}`;
  void notifyBatchStudentsNewAssignment(
    tenantId,
    bc.batch.id,
    created.id,
    data.title,
    created.dueDate,
    courseLabel
  );

  return out;
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
    fileBase64?: string;
    fileName?: string;
  }
) {
  const record = await prisma.assignment.findFirst({ where: { id, tenantId } });
  if (!record) throw new Error("Assignment not found");

  let nextFilePath: string | null | undefined = record.filePath ?? undefined;
  if (data.fileBase64?.trim()) {
    await removeAssignmentHandoutIfExists(record.filePath);
    nextFilePath = await writeAssignmentHandoutFile(
      tenantId,
      id,
      data.fileBase64.trim(),
      data.fileName?.trim() || "handout"
    );
  }

  const { fileBase64: _fb, fileName: _fn, ...rest } = data;
  return prisma.assignment.update({
    where: { id },
    data: {
      ...rest,
      ...(data.fileBase64?.trim() ? { filePath: nextFilePath ?? null } : {}),
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    },
    include: assignmentInclude,
  });
}

export async function deleteAssignment(tenantId: string, id: string) {
  const record = await prisma.assignment.findFirst({ where: { id, tenantId } });
  if (!record) throw new Error("Assignment not found");

  await removeAssignmentHandoutIfExists(record.filePath);

  const subs = await prisma.submission.findMany({ where: { assignmentId: id, tenantId }, select: { filePath: true } });
  for (const s of subs) await removeSubmissionFileIfExists(s.filePath);

  return prisma.assignment.delete({ where: { id } });
}

export async function submitAssignment(
  tenantId: string,
  assignmentId: string,
  studentId: string,
  data: { fileUrl?: string; remarks?: string; fileBase64?: string; fileName?: string }
) {
  const assignment = await prisma.assignment.findFirst({ where: { id: assignmentId, tenantId } });
  if (!assignment) throw new Error("Assignment not found");
  if (assignment.dueDate.getTime() < Date.now()) {
    throw new Error("Submission deadline has passed");
  }

  const existing = await prisma.submission.findUnique({
    where: { assignmentId_studentId: { assignmentId, studentId } },
    select: { filePath: true },
  });

  let nextFilePath: string | null | undefined = existing?.filePath ?? undefined;
  if (data.fileBase64?.trim()) {
    await removeSubmissionFileIfExists(existing?.filePath);
    nextFilePath = await writeSubmissionFile(
      tenantId,
      assignmentId,
      studentId,
      data.fileBase64.trim(),
      data.fileName?.trim() || "submission"
    );
  }

  return prisma.submission.upsert({
    where: { assignmentId_studentId: { assignmentId, studentId } },
    create: {
      tenantId,
      assignmentId,
      studentId,
      fileUrl: data.fileUrl?.trim() || null,
      filePath: nextFilePath ?? null,
      remarks: data.remarks?.trim() || null,
    },
    update: {
      ...(data.fileUrl !== undefined ? { fileUrl: data.fileUrl?.trim() || null } : {}),
      ...(data.remarks !== undefined ? { remarks: data.remarks?.trim() || null } : {}),
      ...(data.fileBase64?.trim()
        ? {
            filePath: nextFilePath ?? null,
            verifiedAt: null,
            verifiedByUserId: null,
          }
        : {}),
      submittedAt: new Date(),
    },
    include: submissionStudentInclude,
  });
}

export async function verifySubmission(
  tenantId: string,
  assignmentId: string,
  studentId: string,
  verifiedByUserId: string
) {
  const submission = await prisma.submission.findFirst({
    where: { assignmentId, studentId, tenantId },
  });
  if (!submission) throw new Error("Submission not found");

  return prisma.submission.update({
    where: { assignmentId_studentId: { assignmentId, studentId } },
    data: { verifiedAt: new Date(), verifiedByUserId },
    include: submissionStudentInclude,
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
  if (marks < 0 || marks > assignment.maxMarks) {
    throw new Error(`Marks must be between 0 and ${assignment.maxMarks}`);
  }

  const submission = await prisma.submission.findUnique({
    where: { assignmentId_studentId: { assignmentId, studentId } },
  });
  if (!submission) throw new Error("Submission not found");

  return prisma.submission.update({
    where: { assignmentId_studentId: { assignmentId, studentId } },
    data: { marks, ...(remarks !== undefined ? { remarks } : {}) },
    include: submissionStudentInclude,
  });
}

export async function assertCanAccessSubmissionFile(
  tenantId: string,
  submissionId: string,
  userId: string,
  role: Role
): Promise<{ absPath: string; downloadName: string }> {
  const sub = await prisma.submission.findFirst({
    where: { id: submissionId, tenantId },
    include: {
      student: { select: { userId: true } },
      assignment: {
        select: { title: true },
      },
    },
  });
  if (!sub?.filePath) throw new Error("File not found");

  const staffRoles: Role[] = [
    Role.ADMIN,
    Role.CMD,
    Role.PRINCIPAL,
    Role.IT_STAFF,
    Role.ACCOUNTS,
    Role.OPERATIONS,
    Role.ASSISTANT_PROFESSOR,
    Role.PROFESSOR,
    Role.CLINICAL_STAFF,
    Role.GUEST_PROFESSOR,
  ];
  const staff = staffRoles.includes(role);
  const isOwner = sub.student.userId === userId;
  if (!staff && !isOwner) throw new Error("Forbidden");

  const abs = path.resolve(process.cwd(), "uploads", sub.filePath);
  const downloadName = path.basename(sub.filePath) || "submission";
  return { absPath: abs, downloadName };
}

export async function assertCanAccessAssignmentHandout(
  tenantId: string,
  assignmentId: string,
  userId: string,
  role: Role
): Promise<{ absPath: string; downloadName: string }> {
  const assignment = await prisma.assignment.findFirst({
    where: { id: assignmentId, tenantId },
    include: {
      batchCourse: { select: { batchId: true } },
    },
  });
  if (!assignment?.filePath) throw new Error("File not found");

  const staffRoles: Role[] = [
    Role.ADMIN,
    Role.CMD,
    Role.PRINCIPAL,
    Role.IT_STAFF,
    Role.ACCOUNTS,
    Role.OPERATIONS,
    Role.ASSISTANT_PROFESSOR,
    Role.PROFESSOR,
    Role.CLINICAL_STAFF,
    Role.GUEST_PROFESSOR,
  ];
  const staff = staffRoles.includes(role);
  if (staff) {
    const abs = path.resolve(process.cwd(), "uploads", assignment.filePath);
    return { absPath: abs, downloadName: path.basename(assignment.filePath) || "handout" };
  }

  const student = await prisma.student.findFirst({
    where: { userId, tenantId },
    select: { batchId: true },
  });
  if (!student || student.batchId !== assignment.batchCourse.batchId) {
    throw new Error("Forbidden");
  }

  const abs = path.resolve(process.cwd(), "uploads", assignment.filePath);
  return { absPath: abs, downloadName: path.basename(assignment.filePath) || "handout" };
}
