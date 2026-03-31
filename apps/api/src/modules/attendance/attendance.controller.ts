import { Request, Response } from "express";
import { z } from "zod";
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

export async function getAttendanceHandler(req: Request, res: Response): Promise<void> {
  try {
    const { batchCourseId, studentId, startDate, endDate } = req.query as Record<string, string | undefined>;
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
