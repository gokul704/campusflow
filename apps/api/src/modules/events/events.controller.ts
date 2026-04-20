import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "./events.service";

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  eventType: z.enum(["EVENT", "WORKSHOP", "HOLIDAY", "EXAM", "ASSIGNMENT_DUE"]).optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().nullable().optional(),
  eventType: z.enum(["EVENT", "WORKSHOP", "HOLIDAY", "EXAM", "ASSIGNMENT_DUE"]).optional(),
});

const bulkEventRow = z.object({
  title: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  eventType: z.enum(["EVENT", "WORKSHOP", "HOLIDAY", "EXAM", "ASSIGNMENT_DUE"]).optional().nullable(),
});
const bulkEventsSchema = z.object({
  rows: z.array(bulkEventRow).min(1).max(500),
});

export async function bulkCreateHandler(req: Request, res: Response): Promise<void> {
  const r = bulkEventsSchema.safeParse(req.body);
  if (!r.success) {
    res.status(400).json({ error: r.error.flatten() });
    return;
  }
  try {
    res.status(201).json(await svc.bulkCreateEvents(req.tenant.id, r.data.rows));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function listHandler(req: Request, res: Response): Promise<void> {
  try {
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    res.json(await svc.listEvents(req.tenant.id, { from, to }));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function createHandler(req: Request, res: Response): Promise<void> {
  const r = createSchema.safeParse(req.body);
  if (!r.success) { res.status(400).json({ error: r.error.flatten() }); return; }
  try {
    res.status(201).json(await svc.createEvent(req.tenant.id, r.data));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function updateHandler(req: Request, res: Response): Promise<void> {
  const r = updateSchema.safeParse(req.body);
  if (!r.success) { res.status(400).json({ error: r.error.flatten() }); return; }
  try {
    res.json(await svc.updateEvent(req.tenant.id, String(req.params.id), r.data));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function deleteHandler(req: Request, res: Response): Promise<void> {
  try {
    await svc.deleteEvent(req.tenant.id, String(req.params.id));
    res.json({ message: "Event deleted" });
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}
