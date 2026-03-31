import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "./faculty.service";

const createSchema = z.object({
  userId: z.string(),
  departmentId: z.string(),
  designation: z.string().min(2),
  qualification: z.string().optional(),
});

const updateSchema = z.object({
  departmentId: z.string().optional(),
  designation: z.string().min(2).optional(),
  qualification: z.string().optional(),
});

export async function listFacultyHandler(req: Request, res: Response): Promise<void> {
  const { departmentId, search, page, limit } = req.query;
  res.json(await svc.listFaculty(
    req.tenant.id,
    departmentId as string,
    search as string,
    page ? Number(page) : 1,
    limit ? Number(limit) : 20
  ));
}

export async function getFacultyHandler(req: Request, res: Response): Promise<void> {
  try {
    res.json(await svc.getFaculty(req.tenant.id, String(req.params.id)));
  } catch {
    res.status(404).json({ error: "Faculty not found" });
  }
}

export async function createFacultyHandler(req: Request, res: Response): Promise<void> {
  const r = createSchema.safeParse(req.body);
  if (!r.success) { res.status(400).json({ error: r.error.flatten() }); return; }
  try {
    const { userId, ...rest } = r.data;
    res.status(201).json(await svc.createFacultyProfile(req.tenant.id, userId, rest));
  } catch (e: unknown) { res.status(400).json({ error: e instanceof Error ? e.message : "Failed" }); }
}

export async function updateFacultyHandler(req: Request, res: Response): Promise<void> {
  const r = updateSchema.safeParse(req.body);
  if (!r.success) { res.status(400).json({ error: r.error.flatten() }); return; }
  try {
    res.json(await svc.updateFacultyProfile(req.tenant.id, String(req.params.id), r.data));
  } catch (e: unknown) { res.status(400).json({ error: e instanceof Error ? e.message : "Failed" }); }
}
