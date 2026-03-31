import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "./exam-grades.service";

const upsertSchema = z.object({
  studentId: z.string(),
  batchCourseId: z.string(),
  examType: z.string().min(2),
  marks: z.number(),
  maxMarks: z.number().optional(),
  remarks: z.string().optional(),
});

export async function listHandler(req: Request, res: Response): Promise<void> {
  try {
    const batchCourseId = req.query.batchCourseId as string | undefined;
    const studentId = req.query.studentId as string | undefined;
    res.json(await svc.listExamGrades(req.tenant.id, { batchCourseId, studentId }));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function upsertHandler(req: Request, res: Response): Promise<void> {
  const r = upsertSchema.safeParse(req.body);
  if (!r.success) { res.status(400).json({ error: r.error.flatten() }); return; }
  try {
    res.json(await svc.upsertExamGrade(req.tenant.id, r.data));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function deleteHandler(req: Request, res: Response): Promise<void> {
  try {
    await svc.deleteExamGrade(req.tenant.id, String(req.params.id));
    res.json({ message: "Exam grade deleted" });
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}
