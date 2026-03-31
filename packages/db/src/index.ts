import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Tenant-scoped query helper
// Usage: db(tenantId).user.findMany(...)
export function db(tenantId: string) {
  return {
    user: {
      findMany: (args?: Parameters<typeof prisma.user.findMany>[0]) =>
        prisma.user.findMany({ ...args, where: { ...args?.where, tenantId } }),
      findFirst: (args?: Parameters<typeof prisma.user.findFirst>[0]) =>
        prisma.user.findFirst({ ...args, where: { ...args?.where, tenantId } }),
      findUnique: prisma.user.findUnique.bind(prisma.user),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      create: (args: Parameters<typeof prisma.user.create>[0]) =>
        prisma.user.create({ ...args, data: { ...args.data, tenantId } as any }),
      update: prisma.user.update.bind(prisma.user),
      delete: prisma.user.delete.bind(prisma.user),
      count: (args?: Parameters<typeof prisma.user.count>[0]) =>
        prisma.user.count({ ...args, where: { ...args?.where, tenantId } }),
    },
    student: {
      findMany: (args?: Parameters<typeof prisma.student.findMany>[0]) =>
        prisma.student.findMany({ ...args, where: { ...args?.where, tenantId } }),
      findFirst: (args?: Parameters<typeof prisma.student.findFirst>[0]) =>
        prisma.student.findFirst({ ...args, where: { ...args?.where, tenantId } }),
      findUnique: prisma.student.findUnique.bind(prisma.student),
      create: (args: Parameters<typeof prisma.student.create>[0]) =>
        prisma.student.create({ ...args, data: { ...args.data, tenantId } }),
      update: prisma.student.update.bind(prisma.student),
      count: (args?: Parameters<typeof prisma.student.count>[0]) =>
        prisma.student.count({ ...args, where: { ...args?.where, tenantId } }),
    },
    course: {
      findMany: (args?: Parameters<typeof prisma.course.findMany>[0]) =>
        prisma.course.findMany({ ...args, where: { ...args?.where, tenantId } }),
      findFirst: (args?: Parameters<typeof prisma.course.findFirst>[0]) =>
        prisma.course.findFirst({ ...args, where: { ...args?.where, tenantId } }),
      findUnique: prisma.course.findUnique.bind(prisma.course),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      create: (args: Parameters<typeof prisma.course.create>[0]) =>
        prisma.course.create({ ...args, data: { ...args.data, tenantId } as any }),
      update: prisma.course.update.bind(prisma.course),
    },
    attendance: {
      findMany: (args?: Parameters<typeof prisma.attendance.findMany>[0]) =>
        prisma.attendance.findMany({ ...args, where: { ...args?.where, tenantId } }),
      create: (args: Parameters<typeof prisma.attendance.create>[0]) =>
        prisma.attendance.create({ ...args, data: { ...args.data, tenantId } }),
      upsert: prisma.attendance.upsert.bind(prisma.attendance),
    },
    assignment: {
      findMany: (args?: Parameters<typeof prisma.assignment.findMany>[0]) =>
        prisma.assignment.findMany({ ...args, where: { ...args?.where, tenantId } }),
      create: (args: Parameters<typeof prisma.assignment.create>[0]) =>
        prisma.assignment.create({ ...args, data: { ...args.data, tenantId } }),
    },
    feePayment: {
      findMany: (args?: Parameters<typeof prisma.feePayment.findMany>[0]) =>
        prisma.feePayment.findMany({ ...args, where: { ...args?.where, tenantId } }),
      create: (args: Parameters<typeof prisma.feePayment.create>[0]) =>
        prisma.feePayment.create({ ...args, data: { ...args.data, tenantId } }),
      update: prisma.feePayment.update.bind(prisma.feePayment),
    },
  };
}

export * from "@prisma/client";
