import { prisma, Role } from "@campusflow/db";
import { hashPassword } from "../auth/auth.service";

async function resolveNewUserPasswordForCreate(plain?: string | null): Promise<string> {
  const p = plain?.trim() || process.env.DEFAULT_NEW_USER_PASSWORD?.trim();
  if (!p || p.length < 8) {
    throw new Error(
      "Set DEFAULT_NEW_USER_PASSWORD in .env (min 8 characters) or pass an explicit password."
    );
  }
  return hashPassword(p);
}

export interface ListUsersOptions {
  tenantId: string;
  role?: Role;
  departmentId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function listUsers(opts: ListUsersOptions) {
  const page = opts.page ?? 1;
  const limit = Math.min(opts.limit ?? 20, 100);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { tenantId: opts.tenantId };
  if (opts.role) where.role = opts.role;
  if (opts.departmentId) where.faculty = { departmentId: opts.departmentId };
  if (opts.search) {
    where.OR = [
      { firstName: { contains: opts.search, mode: "insensitive" } },
      { lastName: { contains: opts.search, mode: "insensitive" } },
      { email: { contains: opts.search, mode: "insensitive" } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        avatarUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

export async function getUser(tenantId: string, userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId },
    select: {
      id: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      avatarUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!user) throw new Error("User not found");
  return user;
}

export async function updateUser(
  tenantId: string,
  userId: string,
  data: { firstName?: string; lastName?: string; phone?: string; avatarUrl?: string }
) {
  const user = await prisma.user.findFirst({ where: { id: userId, tenantId } });
  if (!user) throw new Error("User not found");

  return prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      avatarUrl: true,
      updatedAt: true,
    },
  });
}

export async function setUserActive(tenantId: string, userId: string, isActive: boolean) {
  const user = await prisma.user.findFirst({ where: { id: userId, tenantId } });
  if (!user) throw new Error("User not found");

  return prisma.user.update({
    where: { id: userId },
    data: { isActive },
    select: { id: true, isActive: true },
  });
}

export async function setUserRole(tenantId: string, userId: string, newRole: Role) {
  const user = await prisma.user.findFirst({ where: { id: userId, tenantId } });
  if (!user) throw new Error("User not found");

  if (user.role === newRole) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, updatedAt: true },
    });
  }

  const studentPair =
    (user.role === Role.STUDENT || user.role === Role.GUEST_STUDENT) &&
    (newRole === Role.STUDENT || newRole === Role.GUEST_STUDENT);
  if (!studentPair && (user.role === Role.STUDENT || newRole === Role.STUDENT)) {
    throw new Error(
      "Changing role to/from STUDENT is only allowed between STUDENT and GUEST_STUDENT."
    );
  }

  if (
    newRole === Role.ASSISTANT_PROFESSOR ||
    newRole === Role.PROFESSOR ||
    newRole === Role.CLINICAL_STAFF ||
    newRole === Role.GUEST_PROFESSOR
  ) {
    throw new Error("Use Create User for faculty roles to set department/designation.");
  }

  return prisma.user.update({
    where: { id: userId },
    data: { role: newRole },
    select: { id: true, role: true, updatedAt: true },
  });
}

/** Creates an active user immediately (no invite). */
export async function createDirectUser(
  tenantId: string,
  data: {
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
    password?: string | null;
    phone?: string | null;
    departmentId?: string | null;
    designation?: string | null;
    qualification?: string | null;
    experience?: string | null;
  }
) {
  const email = data.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { tenantId_email: { tenantId, email } } });
  if (existing) throw new Error("User with this email already exists");

  const hashed = await resolveNewUserPasswordForCreate(data.password);

  const isFacultyRole =
    data.role === Role.ASSISTANT_PROFESSOR ||
    data.role === Role.PROFESSOR ||
    data.role === Role.CLINICAL_STAFF ||
    data.role === Role.GUEST_PROFESSOR;

  if (isFacultyRole) {
    const deptId = data.departmentId?.trim();
    const des = data.designation?.trim();
    if (!deptId) throw new Error("departmentId is required for Operations — Lecturer.");
    if (!des) throw new Error("designation is required for Operations — Lecturer.");
    const dept = await prisma.department.findFirst({ where: { id: deptId, tenantId } });
    if (!dept) throw new Error("Department not found.");

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          tenantId,
          email,
          password: hashed,
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          role: data.role,
          phone: data.phone?.trim() || null,
        },
        select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true },
      });
      await tx.faculty.create({
        data: {
          userId: user.id,
          tenantId,
          departmentId: deptId,
          designation: des,
          qualification: data.qualification?.trim() || null,
          experience: data.experience?.trim() || null,
        },
      });
      return user;
    });
  }

  return prisma.user.create({
    data: {
      tenantId,
      email,
      password: hashed,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      role: data.role,
      phone: data.phone?.trim() || null,
    },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true },
  });
}
