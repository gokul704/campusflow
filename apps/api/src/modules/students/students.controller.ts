import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "./students.service";

const createSchema = z.object({
  userId: z.string(),
  batchId: z.string(),
  sectionId: z.string(),
  rollNumber: z.string().min(1),
  parentName: z.string().optional(),
  parentPhone: z.string().optional(),
  address: z.string().optional(),
});

const updateSchema = z.object({
  batchId: z.string().optional(),
  parentName: z.string().optional(),
  parentPhone: z.string().optional(),
  address: z.string().optional(),
});

export async function listStudentsHandler(req: Request, res: Response): Promise<void> {
  const { batchId, sectionId, search, page, limit } = req.query;
  res.json(await svc.listStudents(
    req.tenant.id,
    batchId as string | undefined,
    sectionId as string | undefined,
    search as string | undefined,
    page ? Number(page) : 1,
    limit ? Number(limit) : 20
  ));
}

export async function getStudentHandler(req: Request, res: Response): Promise<void> {
  try {
    res.json(await svc.getStudent(req.tenant.id, String(req.params.id)));
  } catch { res.status(404).json({ error: "Student not found" }); }
}

export async function createStudentHandler(req: Request, res: Response): Promise<void> {
  const r = createSchema.safeParse(req.body);
  if (!r.success) { res.status(400).json({ error: r.error.flatten() }); return; }
  try {
    const { userId, ...rest } = r.data;
    res.status(201).json(await svc.createStudentProfile(req.tenant.id, userId, rest));
  } catch (e: unknown) { res.status(400).json({ error: e instanceof Error ? e.message : "Failed" }); }
}

export async function updateStudentHandler(req: Request, res: Response): Promise<void> {
  const r = updateSchema.safeParse(req.body);
  if (!r.success) { res.status(400).json({ error: r.error.flatten() }); return; }
  try {
    res.json(await svc.updateStudentProfile(req.tenant.id, String(req.params.id), r.data));
  } catch (e: unknown) { res.status(400).json({ error: e instanceof Error ? e.message : "Failed" }); }
}
