import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "./notifications.service";

const createSchema = z.object({
  userId: z.string(),
  title: z.string().min(1),
  body: z.string().min(1),
  link: z.string().optional(),
});

export async function listHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.id) { res.status(401).json({ error: "Unauthorized" }); return; }
    res.json(await svc.listNotifications(req.tenant.id, req.user.id));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function unreadCountHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.id) { res.status(401).json({ error: "Unauthorized" }); return; }
    const count = await svc.getUnreadCount(req.tenant.id, req.user.id);
    res.json({ count });
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function createHandler(req: Request, res: Response): Promise<void> {
  const r = createSchema.safeParse(req.body);
  if (!r.success) { res.status(400).json({ error: r.error.flatten() }); return; }
  try {
    res.status(201).json(
      await svc.createNotification(req.tenant.id, r.data.userId, r.data.title, r.data.body, r.data.link)
    );
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function markReadHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.id) { res.status(401).json({ error: "Unauthorized" }); return; }
    res.json(await svc.markRead(req.tenant.id, req.user.id, String(req.params.id)));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function markAllReadHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.id) { res.status(401).json({ error: "Unauthorized" }); return; }
    const result = await svc.markAllRead(req.tenant.id, req.user.id);
    res.json({ updated: result.count });
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}
