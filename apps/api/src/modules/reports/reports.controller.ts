import { Request, Response } from "express";
import { Role } from "@campusflow/db";
import * as svc from "./reports.service";
import { LEADERSHIP_ROLES } from "../../middleware/roleGroups";

export async function attendanceReportHandler(req: Request, res: Response): Promise<void> {
  try {
    res.json(await svc.attendanceReport(req.tenant.id, String(req.params.batchCourseId)));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function gradeReportHandler(req: Request, res: Response): Promise<void> {
  try {
    res.json(await svc.gradeReport(req.tenant.id, String(req.params.batchCourseId)));
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
