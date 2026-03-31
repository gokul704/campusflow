import { prisma } from "@campusflow/db";
import * as timetableSvc from "../timetable/timetable.service";

export async function listFaculty(tenantId: string, departmentId?: string, search?: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = { tenantId };
  if (departmentId) where.departmentId = departmentId;
  if (search) {
    where.user = {
      OR: [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  const [faculty, total] = await Promise.all([
    prisma.faculty.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: { select: { firstName: true, lastName: true, email: true, phone: true, avatarUrl: true, isActive: true, dateOfBirth: true } },
        department: { select: { name: true, code: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.faculty.count({ where }),
  ]);

  return { faculty, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

export async function getFaculty(tenantId: string, id: string) {
  const faculty = await prisma.faculty.findFirst({
    where: { id, tenantId },
    include: {
      user: { select: { firstName: true, lastName: true, email: true, phone: true, avatarUrl: true, dateOfBirth: true, isActive: true } },
      department: { select: { name: true, code: true } },
    },
  });
  if (!faculty) throw new Error("Faculty not found");

  const scheduleToday = await timetableSvc.listTodaysSlotsForFaculty(tenantId, id);
  return { ...faculty, scheduleToday };
}

export async function createFacultyProfile(
  tenantId: string,
  userId: string,
  data: { departmentId: string; designation: string; qualification?: string }
) {
  const user = await prisma.user.findFirst({ where: { id: userId, tenantId, role: "FACULTY" } });
  if (!user) throw new Error("User not found or not a faculty member");

  const existing = await prisma.faculty.findUnique({ where: { userId } });
  if (existing) throw new Error("Faculty profile already exists");

  return prisma.faculty.create({
    data: { userId, tenantId, ...data },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      department: { select: { name: true } },
    },
  });
}

export async function updateFacultyProfile(
  tenantId: string,
  id: string,
  data: { departmentId?: string; designation?: string; qualification?: string }
) {
  const faculty = await prisma.faculty.findFirst({ where: { id, tenantId } });
  if (!faculty) throw new Error("Faculty not found");
  return prisma.faculty.update({ where: { id }, data });
}
