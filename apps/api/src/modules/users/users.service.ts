import { prisma, Role } from "@campusflow/db";

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
  if (opts.departmentId) where.departmentId = opts.departmentId;
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
