import { Request, Response } from "express";
import { z } from "zod";
import * as deptService from "./departments.service";

const createSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(10),
});

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  code: z.string().min(2).max(10).optional(),
});

export async function listDepartmentsHandler(req: Request, res: Response): Promise<void> {
  const depts = await deptService.listDepartments(req.tenant.id);
  res.json(depts);
}

export async function createDepartmentHandler(req: Request, res: Response): Promise<void> {
  const result = createSchema.safeParse(req.body);
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return; }

  try {
    const dept = await deptService.createDepartment(req.tenant.id, result.data.name, result.data.code);
    res.status(201).json(dept);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed" });
  }
}

export async function updateDepartmentHandler(req: Request, res: Response): Promise<void> {
  const result = updateSchema.safeParse(req.body);
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return; }

  try {
    const dept = await deptService.updateDepartment(req.tenant.id, String(req.params.id), result.data);
    res.json(dept);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed" });
  }
}

export async function deleteDepartmentHandler(req: Request, res: Response): Promise<void> {
  try {
    await deptService.deleteDepartment(req.tenant.id, String(req.params.id));
    res.json({ message: "Department deleted" });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed" });
  }
}
