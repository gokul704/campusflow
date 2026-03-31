import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "./timetable.service";

const createSchema = z.object({
  batchCourseId: z.string(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string(),
  endTime: z.string(),
  room: z.string().optional(),
});

const updateSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  room: z.string().nullable().optional(),
});

export async function listHandler(req: Request, res: Response): Promise<void> {
  try {
    const batchId = req.query.batchId as string | undefined;
    const batchCourseId = req.query.batchCourseId as string | undefined;
    res.json(await svc.listTimetable(req.tenant.id, { batchId, batchCourseId }));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function createHandler(req: Request, res: Response): Promise<void> {
  const r = createSchema.safeParse(req.body);
  if (!r.success) { res.status(400).json({ error: r.error.flatten() }); return; }
  try {
    res.status(201).json(await svc.createSlot(req.tenant.id, r.data));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function updateHandler(req: Request, res: Response): Promise<void> {
  const r = updateSchema.safeParse(req.body);
  if (!r.success) { res.status(400).json({ error: r.error.flatten() }); return; }
  try {
    res.json(await svc.updateSlot(req.tenant.id, String(req.params.id), r.data));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function deleteHandler(req: Request, res: Response): Promise<void> {
  try {
    await svc.deleteSlot(req.tenant.id, String(req.params.id));
    res.json({ message: "Timetable slot deleted" });
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}
