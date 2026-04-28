import { Request, Response } from "express";
import { prisma, Role } from "@campusflow/db";
import * as svc from "./reports.service";
import { LEADERSHIP_ROLES } from "../../middleware/roleGroups";

const FACULTY_ROLES: Role[] = [
  Role.ASSISTANT_PROFESSOR,
  Role.PROFESSOR,
  Role.CLINICAL_STAFF,
  Role.GUEST_PROFESSOR,
];

function isStudentRole(role: Role): boolean {
  return role === Role.STUDENT || role === Role.GUEST_STUDENT;
}

async function canAccessBatchCourse(req: Request, batchCourseId: string): Promise<boolean> {
  const role = req.user?.role as Role | undefined;
  const userId = req.user?.id;
  if (!role || !userId) return false;
  if (!batchCourseId) return false;
  if (LEADERSHIP_ROLES.includes(role)) return true;

  const bc = await prisma.batchCourse.findFirst({
    where: { id: batchCourseId, tenantId: req.tenant.id },
    select: { id: true, batchId: true, faculty: { select: { userId: true } } },
  });
  if (!bc) return false;

  if (isStudentRole(role)) {
    const st = await prisma.student.findFirst({
      where: { userId, tenantId: req.tenant.id },
      select: { batchId: true },
    });
    return Boolean(st && st.batchId === bc.batchId);
  }

  if (FACULTY_ROLES.includes(role)) {
    return bc.faculty?.userId === userId;
  }

  return true;
}

function canAccessAggregateReports(role: Role): boolean {
  return LEADERSHIP_ROLES.includes(role);
}

export async function attendanceReportHandler(req: Request, res: Response): Promise<void> {
  try {
    const batchCourseId = String(req.params.batchCourseId);
    if (!(await canAccessBatchCourse(req, batchCourseId))) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    res.json(await svc.attendanceReport(req.tenant.id, batchCourseId));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function attendanceCourseWiseReportHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!canAccessAggregateReports(req.user!.role as Role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    res.json(await svc.attendanceCourseWiseReport(req.tenant.id));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function attendanceStudentWiseReportHandler(req: Request, res: Response): Promise<void> {
  try {
    let studentId = String(req.query.studentId ?? "").trim();
    if (!studentId) {
      res.status(400).json({ error: "studentId is required" });
      return;
    }
    const role = req.user!.role as Role;
    if (isStudentRole(role)) {
      const st = await prisma.student.findFirst({
        where: { userId: req.user!.id, tenantId: req.tenant.id },
        select: { id: true },
      });
      if (!st) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      studentId = st.id;
    } else if (!LEADERSHIP_ROLES.includes(role)) {
      // Faculty/others can access only students from their own batch-courses.
      const targetStudent = await prisma.student.findFirst({
        where: { id: studentId, tenantId: req.tenant.id },
        select: { batchId: true },
      });
      if (!targetStudent) {
        res.status(404).json({ error: "Student not found" });
        return;
      }
      if (FACULTY_ROLES.includes(role)) {
        const faculty = await prisma.faculty.findFirst({
          where: { userId: req.user!.id, tenantId: req.tenant.id },
          select: { id: true },
        });
        if (!faculty) {
          res.status(403).json({ error: "Forbidden" });
          return;
        }
        const allowed = await prisma.batchCourse.count({
          where: { tenantId: req.tenant.id, batchId: targetStudent.batchId, facultyId: faculty.id },
        });
        if (allowed === 0) {
          res.status(403).json({ error: "Forbidden" });
          return;
        }
      }
    }
    res.json(await svc.attendanceStudentWiseReport(req.tenant.id, studentId));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function attendanceBatchWiseReportHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!canAccessAggregateReports(req.user!.role as Role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    res.json(await svc.attendanceBatchWiseReport(req.tenant.id));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function attendanceSemesterWiseReportHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!canAccessAggregateReports(req.user!.role as Role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    res.json(await svc.attendanceSemesterWiseReport(req.tenant.id));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function gradeReportHandler(req: Request, res: Response): Promise<void> {
  try {
    const batchCourseId = String(req.params.batchCourseId);
    if (!(await canAccessBatchCourse(req, batchCourseId))) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    res.json(await svc.gradeReport(req.tenant.id, batchCourseId));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function feeReportHandler(req: Request, res: Response): Promise<void> {
  try {
    res.json(await svc.feeReport(req.tenant.id));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function exportCsvReportHandler(req: Request, res: Response): Promise<void> {
  const type = String(req.query.type ?? "");
  const format = String(req.query.format ?? "");
  const batchCourseId = req.query.batchCourseId ? String(req.query.batchCourseId) : undefined;

  if (format !== "csv") {
    res.status(400).json({ error: "Use format=csv" });
    return;
  }

  if (type === "fees" && !LEADERSHIP_ROLES.includes(req.user!.role as Role)) {
    res.status(403).json({ error: "Only leadership can export detailed fee payment rows." });
    return;
  }

  try {
    if (["attendance", "general"].includes(type) && !canAccessAggregateReports(req.user!.role as Role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (["assignments", "exams", "timetable"].includes(type)) {
      if (!batchCourseId && !canAccessAggregateReports(req.user!.role as Role)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      if (batchCourseId && !(await canAccessBatchCourse(req, batchCourseId))) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
    }
    let csv: string;
    let filename: string;
    switch (type) {
      case "fees":
        csv = await svc.exportFeesPaymentsCsv(req.tenant.id);
        filename = "fee-payments.csv";
        break;
      case "attendance":
        csv = await svc.exportAttendanceSummaryCsv(req.tenant.id);
        filename = "attendance-summary.csv";
        break;
      case "timetable":
        csv = await svc.exportTimetableCsv(req.tenant.id, batchCourseId);
        filename = batchCourseId ? `timetable-${batchCourseId}.csv` : "timetable-all.csv";
        break;
      case "assignments":
        if (!batchCourseId) {
          res.status(400).json({ error: "batchCourseId is required for assignments export" });
          return;
        }
        csv = await svc.exportAssignmentsCsv(req.tenant.id, batchCourseId);
        filename = `assignments-${batchCourseId}.csv`;
        break;
      case "exams":
        if (!batchCourseId) {
          res.status(400).json({ error: "batchCourseId is required for exams export" });
          return;
        }
        csv = await svc.exportExamsCsv(req.tenant.id, batchCourseId);
        filename = `exam-grades-${batchCourseId}.csv`;
        break;
      case "general":
        csv = await svc.exportGeneralCsv(req.tenant.id);
        filename = "general-stats.csv";
        break;
      default:
        res.status(400).json({ error: "Unknown type" });
        return;
    }
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function timetableConflictsHandler(req: Request, res: Response): Promise<void> {
  try {
    res.json(await svc.timetableConflictsJson(req.tenant.id));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}
