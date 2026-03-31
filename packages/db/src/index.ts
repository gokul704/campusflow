import { PrismaClient, Prisma } from "@prisma/client";

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
      findMany: (args?: Prisma.UserFindManyArgs) =>
        prisma.user.findMany({ ...args, where: { ...args?.where, tenantId } }),
      findFirst: (args?: Prisma.UserFindFirstArgs) =>
        prisma.user.findFirst({ ...args, where: { ...args?.where, tenantId } }),
      findUnique: prisma.user.findUnique.bind(prisma.user),
      create: (args: Prisma.UserCreateArgs) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        prisma.user.create({ ...args, data: { ...args.data, tenantId } as any }),
      update: prisma.user.update.bind(prisma.user),
      delete: prisma.user.delete.bind(prisma.user),
      count: (args?: Prisma.UserCountArgs) =>
        prisma.user.count({ ...args, where: { ...args?.where, tenantId } }),
    },
    student: {
      findMany: (args?: Prisma.StudentFindManyArgs) =>
        prisma.student.findMany({ ...args, where: { ...args?.where, tenantId } }),
      findFirst: (args?: Prisma.StudentFindFirstArgs) =>
        prisma.student.findFirst({ ...args, where: { ...args?.where, tenantId } }),
      findUnique: prisma.student.findUnique.bind(prisma.student),
      create: (args: Prisma.StudentCreateArgs) =>
        prisma.student.create({ ...args, data: { ...args.data, tenantId } }),
      update: prisma.student.update.bind(prisma.student),
      count: (args?: Prisma.StudentCountArgs) =>
        prisma.student.count({ ...args, where: { ...args?.where, tenantId } }),
    },
    course: {
      findMany: (args?: Prisma.CourseFindManyArgs) =>
        prisma.course.findMany({ ...args, where: { ...args?.where, tenantId } }),
      findFirst: (args?: Prisma.CourseFindFirstArgs) =>
        prisma.course.findFirst({ ...args, where: { ...args?.where, tenantId } }),
      findUnique: prisma.course.findUnique.bind(prisma.course),
      create: (args: Prisma.CourseCreateArgs) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        prisma.course.create({ ...args, data: { ...args.data, tenantId } as any }),
      update: prisma.course.update.bind(prisma.course),
    },
    attendance: {
      findMany: (args?: Prisma.AttendanceFindManyArgs) =>
        prisma.attendance.findMany({ ...args, where: { ...args?.where, tenantId } }),
      create: (args: Prisma.AttendanceCreateArgs) =>
        prisma.attendance.create({ ...args, data: { ...args.data, tenantId } }),
      upsert: prisma.attendance.upsert.bind(prisma.attendance),
    },
    assignment: {
      findMany: (args?: Prisma.AssignmentFindManyArgs) =>
        prisma.assignment.findMany({ ...args, where: { ...args?.where, tenantId } }),
      create: (args: Prisma.AssignmentCreateArgs) =>
        prisma.assignment.create({ ...args, data: { ...args.data, tenantId } }),
    },
    feePayment: {
      findMany: (args?: Prisma.FeePaymentFindManyArgs) =>
        prisma.feePayment.findMany({ ...args, where: { ...args?.where, tenantId } }),
      create: (args: Prisma.FeePaymentCreateArgs) =>
        prisma.feePayment.create({ ...args, data: { ...args.data, tenantId } }),
      update: prisma.feePayment.update.bind(prisma.feePayment),
    },
  };
}

export * from "@prisma/client";
