import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "./batch-courses.service";

const createSchema = z.object({
  batchId: z.string(),
  sectionId: z.string(),
  courseId: z.string(),
  semester: z.number().int().min(1).max(10),
  facultyId: z.string().optional(),
});

const updateSchema = z.object({
  facultyId: z.string().nullable().optional(),
});

const bulkBatchCourseRow = z.object({
  batchCourseId: z.string().optional().nullable(),
  batchId: z.string().optional().nullable(),
  sectionId: z.string().optional().nullable(),
  batchName: z.string().optional().nullable(),
  sectionName: z.string().optional().nullable(),
  courseCode: z.string().optional().nullable(),
  courseId: z.string().optional().nullable(),
  semester: z.coerce.number().int().min(1).max(20),
  facultyId: z.string().optional().nullable(),
  facultyEmail: z.string().optional().nullable(),
});
const bulkBatchCoursesSchema = z.object({
  rows: z.array(bulkBatchCourseRow).min(1).max(500),
});

export async function bulkCreateHandler(req: Request, res: Response): Promise<void> {
  const r = bulkBatchCoursesSchema.safeParse(req.body);
  if (!r.success) {
    res.status(400).json({ error: r.error.flatten() });
    return;
  }
  try {
    res.status(201).json(await svc.bulkCreateBatchCourses(req.tenant.id, r.data.rows));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function listHandler(req: Request, res: Response): Promise<void> {
  try {
    const batchId = req.query.batchId as string | undefined;
    const sectionId = req.query.sectionId as string | undefined;
    const semester = req.query.semester ? Number(req.query.semester) : undefined;
    res.json(await svc.listBatchCourses(req.tenant.id, { batchId, sectionId, semester }));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function createHandler(req: Request, res: Response): Promise<void> {
  const r = createSchema.safeParse(req.body);
  if (!r.success) { res.status(400).json({ error: r.error.flatten() }); return; }
  try {
    res.status(201).json(await svc.createBatchCourse(req.tenant.id, r.data));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function updateHandler(req: Request, res: Response): Promise<void> {
  const r = updateSchema.safeParse(req.body);
  if (!r.success) { res.status(400).json({ error: r.error.flatten() }); return; }
  try {
    res.json(await svc.updateBatchCourse(req.tenant.id, String(req.params.id), r.data));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function deleteHandler(req: Request, res: Response): Promise<void> {
  try {
    await svc.deleteBatchCourse(req.tenant.id, String(req.params.id));
    res.json({ message: "BatchCourse deleted" });
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}
