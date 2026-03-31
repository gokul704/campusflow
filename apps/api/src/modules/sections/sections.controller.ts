import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "./sections.service";

const createSchema = z.object({
  batchId: z.string(),
  name: z.string().min(1).max(5),
});

export async function listSectionsHandler(req: Request, res: Response): Promise<void> {
  const batchId = req.query.batchId as string | undefined;
  res.json(await svc.listSections(req.tenant.id, batchId));
}

export async function createSectionHandler(req: Request, res: Response): Promise<void> {
  const r = createSchema.safeParse(req.body);
  if (!r.success) { res.status(400).json({ error: r.error.flatten() }); return; }
  try {
    res.status(201).json(await svc.createSection(req.tenant.id, r.data.batchId, r.data.name));
  } catch (e: unknown) { res.status(400).json({ error: e instanceof Error ? e.message : "Failed" }); }
}

export async function deleteSectionHandler(req: Request, res: Response): Promise<void> {
  try {
    await svc.deleteSection(req.tenant.id, String(req.params.id));
    res.json({ message: "Section deleted" });
  } catch (e: unknown) { res.status(400).json({ error: e instanceof Error ? e.message : "Failed" }); }
}
