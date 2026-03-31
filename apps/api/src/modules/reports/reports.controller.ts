import { Request, Response } from "express";
import * as svc from "./reports.service";

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
