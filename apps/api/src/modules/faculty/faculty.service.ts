import { prisma, Role } from "@campusflow/db";
import { resolveDepartmentId } from "../../lib/bulkImportResolvers";
import { hashPassword } from "../auth/auth.service";
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
  const user = await prisma.user.findFirst({ where: { id: userId, tenantId, role: "OPERATIONS_LECTURER" } });
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

async function resolveNewFacultyPassword(plain?: string | null): Promise<string> {
  const p = plain?.trim() || process.env.DEFAULT_NEW_USER_PASSWORD?.trim();
  if (!p || p.length < 8) {
    throw new Error(
      "Set DEFAULT_NEW_USER_PASSWORD in .env (min 8 characters) or pass an explicit password for each user."
    );
  }
  return hashPassword(p);
}

export type CreateFacultyWithUserInput = {
  email: string;
  firstName: string;
  lastName: string;
  password?: string | null;
  phone?: string | null;
  designation: string;
  qualification?: string | null;
  departmentId?: string | null;
  departmentCode?: string | null;
  departmentName?: string | null;
};

/** Creates faculty User + Faculty profile (same pattern as students). */
export async function createFacultyWithUser(tenantId: string, input: CreateFacultyWithUserInput) {
  const email = input.email.trim().toLowerCase();
  const dupUser = await prisma.user.findUnique({ where: { tenantId_email: { tenantId, email } } });
  if (dupUser) throw new Error("User with this email already exists");

  const departmentId = await resolveDepartmentId(
    tenantId,
    {
      departmentId: input.departmentId,
      departmentCode: input.departmentCode,
      departmentName: input.departmentName,
    },
    true
  );

  const hashed = await resolveNewFacultyPassword(input.password);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        tenantId,
        email,
        password: hashed,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        role: Role.OPERATIONS_LECTURER,
        phone: input.phone?.trim() || null,
      },
    });
    return tx.faculty.create({
      data: {
        userId: user.id,
        tenantId,
        departmentId: departmentId!,
        designation: input.designation.trim(),
        qualification: input.qualification?.trim() || null,
      },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        department: { select: { name: true, code: true } },
      },
    });
  });
}

export async function bulkCreateFacultyWithUsers(
  tenantId: string,
  rows: CreateFacultyWithUserInput[],
  defaultPassword?: string | null
): Promise<{ created: number; failed: { index: number; email?: string; error: string }[] }> {
  const failed: { index: number; email?: string; error: string }[] = [];
  let created = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    try {
      await createFacultyWithUser(tenantId, {
        ...row,
        password: row.password?.trim() || defaultPassword?.trim() || null,
      });
      created++;
    } catch (e) {
      failed.push({
        index: i,
        email: row.email,
        error: e instanceof Error ? e.message : "Failed",
      });
    }
  }
  return { created, failed };
}
