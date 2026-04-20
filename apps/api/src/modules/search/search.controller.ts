import { Request, Response } from "express";
import { prisma } from "@campusflow/db";

const LIMIT = 8;

/** Lightweight global search for dashboard header (students, faculty, courses). */
export async function searchHandler(req: Request, res: Response): Promise<void> {
  const q = String(req.query.q ?? "")
    .trim()
    .slice(0, 80);
  if (!q) {
    res.json({ students: [], faculty: [], courses: [] });
    return;
  }

  const tenantId = req.tenant.id;
  const contains = q;

  const [students, faculty, courses] = await Promise.all([
    prisma.student.findMany({
      where: {
        tenantId,
        OR: [
          { rollNumber: { contains, mode: "insensitive" } },
          { user: { firstName: { contains, mode: "insensitive" } } },
          { user: { lastName: { contains, mode: "insensitive" } } },
          { user: { email: { contains, mode: "insensitive" } } },
        ],
      },
      take: LIMIT,
      select: {
        id: true,
        rollNumber: true,
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    }),
    prisma.faculty.findMany({
      where: {
        tenantId,
        OR: [
          { designation: { contains, mode: "insensitive" } },
          { user: { firstName: { contains, mode: "insensitive" } } },
          { user: { lastName: { contains, mode: "insensitive" } } },
          { user: { email: { contains, mode: "insensitive" } } },
        ],
      },
      take: LIMIT,
      select: {
        id: true,
        designation: true,
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    }),
    prisma.course.findMany({
      where: {
        tenantId,
        OR: [
          { name: { contains, mode: "insensitive" } },
          { code: { contains, mode: "insensitive" } },
        ],
      },
      take: LIMIT,
      select: { id: true, name: true, code: true },
    }),
  ]);

  res.json({ students, faculty, courses });
}
