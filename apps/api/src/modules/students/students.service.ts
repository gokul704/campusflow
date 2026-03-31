import { prisma } from "@campusflow/db";
import * as timetableSvc from "../timetable/timetable.service";

export async function listStudents(tenantId: string, batchId?: string, sectionId?: string, search?: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = { tenantId };
  if (batchId) where.batchId = batchId;
  if (sectionId) where.sectionId = sectionId;
  if (search) {
    where.user = {
      OR: [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: { select: { firstName: true, lastName: true, email: true, phone: true, avatarUrl: true, isActive: true, dateOfBirth: true } },
        batch: { select: { name: true } },
        section: { select: { name: true } },
      },
      orderBy: { rollNumber: "asc" },
    }),
    prisma.student.count({ where }),
  ]);

  return { students, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

export async function getStudent(tenantId: string, id: string) {
  const student = await prisma.student.findFirst({
    where: { id, tenantId },
    include: {
      user: { select: { firstName: true, lastName: true, email: true, phone: true, avatarUrl: true, dateOfBirth: true, isActive: true } },
      batch: { select: { id: true, name: true } },
      section: { select: { id: true, name: true } },
    },
  });
  if (!student) throw new Error("Student not found");

  const scheduleToday = await timetableSvc.listTodaysSlotsForStudent(tenantId, id);
  return { ...student, scheduleToday };
}

export async function createStudentProfile(
  tenantId: string,
  userId: string,
  data: { batchId: string; sectionId: string; rollNumber: string; parentName?: string; parentPhone?: string; address?: string }
) {
  const user = await prisma.user.findFirst({ where: { id: userId, tenantId, role: "STUDENT" } });
  if (!user) throw new Error("User not found or not a student");

  const existing = await prisma.student.findUnique({ where: { userId } });
  if (existing) throw new Error("Student profile already exists");

  const rollExists = await prisma.student.findUnique({ where: { tenantId_rollNumber: { tenantId, rollNumber: data.rollNumber } } });
  if (rollExists) throw new Error("Roll number already taken");

  return prisma.student.create({
    data: { userId, tenantId, ...data },
    include: { user: { select: { firstName: true, lastName: true, email: true } }, batch: true },
  });
}

export async function updateStudentProfile(
  tenantId: string,
  id: string,
  data: { batchId?: string; parentName?: string; parentPhone?: string; address?: string }
) {
  const student = await prisma.student.findFirst({ where: { id, tenantId } });
  if (!student) throw new Error("Student not found");
  return prisma.student.update({ where: { id }, data });
}
