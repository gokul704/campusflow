import { Request, Response } from "express";
import { z } from "zod";
import { prisma, Role } from "@campusflow/db";
import * as svc from "./attendance.service";

const bulkMarkSchema = z.object({
  batchCourseId: z.string(),
  date: z.string(),
  records: z.array(
    z.object({
      studentId: z.string(),
      status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
    })
  ),
});

const bulkImportAttendanceRow = z.object({
  batchCourseId: z.string().optional().nullable(),
  batchId: z.string().optional().nullable(),
  sectionId: z.string().optional().nullable(),
  batchName: z.string().optional().nullable(),
  sectionName: z.string().optional().nullable(),
  courseCode: z.string().optional().nullable(),
  courseId: z.string().optional().nullable(),
  semester: z.coerce.number().int().min(1).max(20).optional().nullable(),
  date: z.string(),
  rollNumber: z.string().optional().nullable(),
  studentEmail: z.string().optional().nullable(),
  status: z.string(),
});
const bulkImportAttendanceSchema = z.object({
  rows: z.array(bulkImportAttendanceRow).min(1).max(2000),
});

const TEACHING_FACULTY_ROLES: Role[] = [
  Role.ASSISTANT_PROFESSOR,
  Role.PROFESSOR,
  Role.CLINICAL_STAFF,
  Role.GUEST_PROFESSOR,
];

function isTeachingFacultyRole(role: Role | undefined): boolean {
  return role !== undefined && TEACHING_FACULTY_ROLES.includes(role);
}

export async function bulkImportAttendanceHandler(req: Request, res: Response): Promise<void> {
  const r = bulkImportAttendanceSchema.safeParse(req.body);
  if (!r.success) {
    res.status(400).json({ error: r.error.flatten() });
    return;
  }
  try {
    res.status(201).json(await svc.bulkImportAttendanceRows(req.tenant.id, r.data.rows));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function getAttendanceHandler(req: Request, res: Response): Promise<void> {
  try {
    const role = req.user?.role as Role | undefined;
    if (isTeachingFacultyRole(role)) {
      res.status(403).json({ error: "Attendance is not available for faculty accounts" });
      return;
    }
    let { batchCourseId, studentId, startDate, endDate } = req.query as Record<string, string | undefined>;
    if (req.user?.id && role && (role === Role.STUDENT || role === Role.GUEST_STUDENT)) {
      const student = await prisma.student.findFirst({
        where: { userId: req.user.id, tenantId: req.tenant.id },
        select: { id: true, batchId: true },
      });
      if (!student) {
        res.json([]);
        return;
      }
      studentId = student.id;
      if (batchCourseId) {
        const bc = await prisma.batchCourse.findFirst({
          where: { id: batchCourseId, tenantId: req.tenant.id },
          select: { batchId: true },
        });
        if (!bc || bc.batchId !== student.batchId) {
          res.status(403).json({ error: "Forbidden" });
          return;
        }
      }
    }
    res.json(await svc.getAttendance(req.tenant.id, { batchCourseId, studentId, startDate, endDate }));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function bulkMarkAttendanceHandler(req: Request, res: Response): Promise<void> {
  const r = bulkMarkSchema.safeParse(req.body);
  if (!r.success) { res.status(400).json({ error: r.error.flatten() }); return; }
  try {
    const results = await svc.bulkMarkAttendance(
      req.tenant.id,
      r.data.batchCourseId,
      r.data.date,
      r.data.records
    );
    res.json({ count: results.length, records: results });
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function getAttendanceSummaryHandler(req: Request, res: Response): Promise<void> {
  try {
    if (isTeachingFacultyRole(req.user?.role as Role | undefined)) {
      res.status(403).json({ error: "Attendance is not available for faculty accounts" });
      return;
    }
    res.json(await svc.getAttendanceSummary(req.tenant.id, String(req.params.batchCourseId)));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function deleteHandler(req: Request, res: Response): Promise<void> {
  try {
    await svc.deleteAttendance(req.tenant.id, String(req.params.id));
    res.json({ message: "Attendance record deleted" });
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}
