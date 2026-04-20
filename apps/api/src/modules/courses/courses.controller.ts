import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "./courses.service";

const createSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(15),
  departmentId: z.string().optional(),
  credits: z.number().int().min(0).max(10),
  isCommon: z.boolean().optional(),
});

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  credits: z.number().int().min(0).max(10).optional(),
  isCommon: z.boolean().optional(),
  departmentId: z.string().nullable().optional(),
});

const bulkCourseRow = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(15),
  credits: z.coerce.number().int().min(0).max(30),
  isCommon: z.coerce.boolean().optional(),
  departmentId: z.string().optional().nullable(),
  departmentCode: z.string().optional().nullable(),
  departmentName: z.string().optional().nullable(),
});
const bulkCoursesSchema = z.object({
  rows: z.array(bulkCourseRow).min(1).max(500),
});

export async function bulkCreateCoursesHandler(req: Request, res: Response): Promise<void> {
  const r = bulkCoursesSchema.safeParse(req.body);
  if (!r.success) {
    res.status(400).json({ error: r.error.flatten() });
    return;
  }
  try {
    res.status(201).json(await svc.bulkCreateCourses(req.tenant.id, r.data.rows));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function listCoursesHandler(req: Request, res: Response): Promise<void> {
  res.json(await svc.listCourses(req.tenant.id, req.query.departmentId as string));
}

export async function createCourseHandler(req: Request, res: Response): Promise<void> {
  const r = createSchema.safeParse(req.body);
  if (!r.success) { res.status(400).json({ error: r.error.flatten() }); return; }
  try {
    res.status(201).json(await svc.createCourse(req.tenant.id, r.data));
  } catch (e: unknown) { res.status(400).json({ error: e instanceof Error ? e.message : "Failed" }); }
}

export async function updateCourseHandler(req: Request, res: Response): Promise<void> {
  const r = updateSchema.safeParse(req.body);
  if (!r.success) { res.status(400).json({ error: r.error.flatten() }); return; }
  try {
    res.json(await svc.updateCourse(req.tenant.id, String(req.params.id), r.data));
  } catch (e: unknown) { res.status(400).json({ error: e instanceof Error ? e.message : "Failed" }); }
}

export async function deleteCourseHandler(req: Request, res: Response): Promise<void> {
  try {
    await svc.deleteCourse(req.tenant.id, String(req.params.id));
    res.json({ message: "Course deleted" });
  } catch (e: unknown) { res.status(400).json({ error: e instanceof Error ? e.message : "Failed" }); }
}
