import { Request, Response } from "express";
import { z } from "zod";
import * as tenantsService from "./tenants.service";

const createTenantSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
  domain: z.string().optional(),
});

export async function createTenantHandler(req: Request, res: Response): Promise<void> {
  const result = createTenantSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  try {
    const tenant = await tenantsService.createTenant(result.data);
    res.status(201).json(tenant);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create tenant";
    res.status(400).json({ error: message });
  }
}

export async function listTenantsHandler(req: Request, res: Response): Promise<void> {
  const tenants = await tenantsService.listTenants();
  res.json(tenants);
}
