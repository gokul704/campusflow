import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "./batches.service";

const createSchema = z.object({
  name: z.string().min(2),
  startYear: z.number().int().min(2000),
  endYear: z.number().int().min(2000),
});

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  isActive: z.boolean().optional(),
});

const bulkBatchRow = z.object({
  name: z.string().min(2),
  startYear: z.coerce.number().int().min(1990).max(2100),
  endYear: z.coerce.number().int().min(1990).max(2100),
});
const bulkBatchesSchema = z.object({
  rows: z.array(bulkBatchRow).min(1).max(200),
});

export async function bulkCreateBatchesHandler(req: Request, res: Response): Promise<void> {
  const r = bulkBatchesSchema.safeParse(req.body);
  if (!r.success) {
    res.status(400).json({ error: r.error.flatten() });
    return;
  }
  try {
    res.status(201).json(await svc.bulkCreateBatches(req.tenant.id, r.data.rows));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function listBatchesHandler(req: Request, res: Response): Promise<void> {
  res.json(await svc.listBatches(req.tenant.id));
}

export async function createBatchHandler(req: Request, res: Response): Promise<void> {
  const r = createSchema.safeParse(req.body);
  if (!r.success) { res.status(400).json({ error: r.error.flatten() }); return; }
  try {
    res.status(201).json(await svc.createBatch(req.tenant.id, r.data.name, r.data.startYear, r.data.endYear));
  } catch (e: unknown) { res.status(400).json({ error: e instanceof Error ? e.message : "Failed" }); }
}

export async function updateBatchHandler(req: Request, res: Response): Promise<void> {
  const r = updateSchema.safeParse(req.body);
  if (!r.success) { res.status(400).json({ error: r.error.flatten() }); return; }
  try {
    res.json(await svc.updateBatch(req.tenant.id, String(req.params.id), r.data));
  } catch (e: unknown) { res.status(400).json({ error: e instanceof Error ? e.message : "Failed" }); }
}

export async function deleteBatchHandler(req: Request, res: Response): Promise<void> {
  try {
    await svc.deleteBatch(req.tenant.id, String(req.params.id));
    res.json({ message: "Batch deleted" });
  } catch (e: unknown) { res.status(400).json({ error: e instanceof Error ? e.message : "Failed" }); }
}
