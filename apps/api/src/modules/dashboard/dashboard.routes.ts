import { Router, type Request, type Response, type NextFunction } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireModuleAction } from "../../lib/tenantAccessMatrix";
import { prisma } from "@campusflow/db";

const router = Router();
router.use(authenticate, requireModuleAction("dashboard", "view"));

/** Express 4 does not forward rejected promises from async route handlers to `errorHandler` — wrap explicitly. */
function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/* ─── /stats ─────────────────────────────────────────────────────────────── */
router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const tenantId = req.tenant.id;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [
      totalStudents,
      totalFaculty,
      totalDepartments,
      totalCourses,
      totalBatches,
      totalSections,
      feeCollectedThisMonth,
      pendingFeesCount,
      pendingFeesAmountAgg,
      upcomingEventsCount,
      totalUsers,
    ] = await Promise.all([
      prisma.student.count({ where: { tenantId } }),
      prisma.faculty.count({ where: { tenantId } }),
      prisma.department.count({ where: { tenantId } }),
      prisma.course.count({ where: { tenantId } }),
      prisma.batch.count({ where: { tenantId } }),
      prisma.section.count({ where: { tenantId } }),
      prisma.feePayment.aggregate({
        where: { tenantId, status: "PAID", paidAt: { gte: monthStart, lte: monthEnd } },
        _sum: { amount: true },
      }),
      prisma.feePayment.count({ where: { tenantId, status: "PENDING" } }),
      prisma.feePayment.aggregate({
        where: { tenantId, status: "PENDING" },
        _sum: { amount: true },
      }),
      prisma.event.count({ where: { tenantId, startDate: { gte: now } } }),
      prisma.user.count({ where: { tenantId, isActive: true } }),
    ]);

    res.json({
      totalStudents,
      totalFaculty,
      totalDepartments,
      totalCourses,
      totalBatches,
      totalSections,
      feeCollectedThisMonth: feeCollectedThisMonth._sum?.amount ?? 0,
      pendingFeesCount,
      pendingFeesAmount: pendingFeesAmountAgg._sum?.amount ?? 0,
      upcomingEventsCount,
      totalUsers,
    });
  })
);

/* ─── /charts ─────────────────────────────────────────────────────────────── */
router.get(
  "/charts",
  asyncHandler(async (req, res) => {
  const tenantId = req.tenant.id;
  const now = new Date();

  // ── This week's daily attendance (Mon–Sat) ────────────────────────────────
  const dayOfWeek = now.getDay(); // 0=Sun,1=Mon...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekDays = Array.from({ length: 6 }, (_, i) => {
    const dayStart = new Date(monday);
    dayStart.setDate(monday.getDate() + i);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    return { dayStart, dayEnd, label: DAY_NAMES[i]! };
  });
  const weeklyRaw = await Promise.all(
    weekDays.map(({ dayStart, dayEnd }) =>
      Promise.all([
        prisma.attendance.count({ where: { tenantId, status: "PRESENT", date: { gte: dayStart, lte: dayEnd } } }),
        prisma.attendance.count({ where: { tenantId, date: { gte: dayStart, lte: dayEnd } } }),
      ])
    )
  );
  const weeklyAttendance = weeklyRaw.map(([present, total], i) => ({
    day: DAY_NAMES[i]!, present, absent: total - present,
  }));

  // ── Students per batch (for donut) ────────────────────────────────────────
  const batches = await prisma.batch.findMany({
    where: { tenantId },
    include: { _count: { select: { students: true } } },
    orderBy: { startYear: "desc" },
    take: 6,
  });
  const batchDistribution = batches.map((b: { name: string; _count: { students: number } }) => ({
    name: b.name,
    value: b._count.students,
  }));

  // ── 6-month fee collection ────────────────────────────────────────────────
  const feeMonths = Array.from({ length: 6 }, (_, idx) => {
    const i = 5 - idx;
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    return { d, start, end };
  });
  const feeRaw = await Promise.all(
    feeMonths.map(({ start, end }) =>
      Promise.all([
        prisma.feePayment.aggregate({
          where: { tenantId, status: "PAID", paidAt: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
        prisma.feePayment.aggregate({
          where: { tenantId, status: "PENDING", createdAt: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
      ])
    )
  );
  const feeCollectionTrend = feeRaw.map(([collected, pending], idx) => ({
    month: feeMonths[idx]!.d.toLocaleString("default", { month: "short" }),
    collected: Number(((collected._sum?.amount ?? 0) / 1000).toFixed(1)),
    pending: Number(((pending._sum?.amount ?? 0) / 1000).toFixed(1)),
  }));

  // ── Upcoming events ───────────────────────────────────────────────────────
  const upcomingEvents = await prisma.event.findMany({
    where: { tenantId, startDate: { gte: now } },
    orderBy: { startDate: "asc" },
    take: 8,
    select: { id: true, title: true, startDate: true, eventType: true, description: true },
  });

  // ── All events this month (for calendar dots) ─────────────────────────────
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const monthEvents = await prisma.event.findMany({
    where: { tenantId, startDate: { gte: monthStart, lte: monthEnd } },
    select: { startDate: true },
  });
  const eventDays = [...new Set(monthEvents.map((e: { startDate: Date }) => new Date(e.startDate).getDate()))];

  // ── Recent notices (assignments + events combined) ────────────────────────
  const [recentAssignments, recentEvents] = await Promise.all([
    prisma.assignment.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true, title: true, dueDate: true, createdAt: true,
        batchCourse: {
          select: {
            course: { select: { name: true } },
            batch: { select: { name: true } },
            section: { select: { name: true } },
          },
        },
      },
    }),
    prisma.event.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, title: true, startDate: true, eventType: true },
    }),
  ]);

  // ── Department overview ───────────────────────────────────────────────────
  const departments = await prisma.department.findMany({
    where: { tenantId },
    include: { _count: { select: { faculty: true, courses: true } } },
  });
  const deptOverview = departments.map((d: { name: string; code: string | null; _count: { faculty: number; courses: number } }) => ({
    name: d.code ?? d.name,
    fullName: d.name,
    faculty: d._count.faculty,
    courses: d._count.courses,
  }));

  res.json({
    weeklyAttendance,
    batchDistribution,
    feeCollectionTrend,
    upcomingEvents,
    eventDays,
    recentAssignments,
    recentEvents,
    deptOverview,
  });
  })
);

export default router;
