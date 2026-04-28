import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "./digital-library.service";

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  categoryId: z.string().min(1),
  originalFileName: z.string().min(1),
  fileBase64: z.string().min(1),
});

const createCategorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export async function listLibraryItemsHandler(req: Request, res: Response): Promise<void> {
  try {
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const categoryId = typeof req.query.categoryId === "string" ? req.query.categoryId : undefined;
    const limitRaw = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;
    const limit = Number.isFinite(limitRaw) ? limitRaw : undefined;
    res.json(await svc.listLibraryItems(req.tenant.id, { q, categoryId, limit }));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function listLibraryCategoriesHandler(req: Request, res: Response): Promise<void> {
  try {
    res.json(await svc.listLibraryCategories(req.tenant.id));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function createLibraryCategoryHandler(req: Request, res: Response): Promise<void> {
  const r = createCategorySchema.safeParse(req.body);
  if (!r.success) {
    res.status(400).json({ error: r.error.flatten() });
    return;
  }
  try {
    res.status(201).json(await svc.createLibraryCategory(req.tenant.id, r.data));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function createLibraryItemHandler(req: Request, res: Response): Promise<void> {
  const r = createSchema.safeParse(req.body);
  if (!r.success) {
    res.status(400).json({ error: r.error.flatten() });
    return;
  }
  try {
    res.status(201).json(await svc.createLibraryItem(req.tenant.id, req.user!.id, r.data));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function downloadLibraryFileHandler(req: Request, res: Response): Promise<void> {
  try {
    const item = await svc.getLibraryFile(req.tenant.id, String(req.params.id));
    // Allow PDF rendering inside iframe on the web app (API/UI can be different origins in dev/prod).
    res.removeHeader("X-Frame-Options");
    res.setHeader("Content-Security-Policy", "frame-ancestors *");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(item.originalFileName)}"`);
    res.sendFile(item.filePath);
  } catch (e: unknown) {
    res.status(404).json({ error: e instanceof Error ? e.message : "File not found" });
  }
}

export async function deleteLibraryItemHandler(req: Request, res: Response): Promise<void> {
  try {
    await svc.deleteLibraryItem(req.tenant.id, String(req.params.id));
    res.json({ message: "Document deleted" });
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}
