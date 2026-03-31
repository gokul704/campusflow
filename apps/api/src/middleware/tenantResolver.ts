import { Request, Response, NextFunction } from "express";
import { prisma } from "@campusflow/db";

/**
 * Tenant Resolver Middleware
 *
 * Identifies the tenant via:
 * 1. Subdomain (production): mish.campusflow.io → looks up by slug
 * 2. x-tenant-key header (dev/API): random UUID assigned to each tenant
 *
 * Never exposes the slug directly from the client.
 */
export async function tenantResolver(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let tenant: { id: string; slug: string; name: string; plan: string; isActive: boolean } | null = null;

    const tenantKey = req.headers["x-tenant-key"];

    if (tenantKey && typeof tenantKey === "string") {
      // Dev / API clients send the random UUID publicKey
      tenant = await prisma.tenant.findUnique({
        where: { publicKey: tenantKey },
        select: { id: true, slug: true, name: true, plan: true, isActive: true },
      });
    } else {
      // Production: extract slug from subdomain
      const host = req.hostname;
      const parts = host.split(".");
      if (parts.length >= 2 && parts[0] !== "www") {
        const slug = parts[0];
        tenant = await prisma.tenant.findUnique({
          where: { slug },
          select: { id: true, slug: true, name: true, plan: true, isActive: true },
        });
      }
    }

    if (!tenant) {
      res.status(400).json({ error: "Unable to identify tenant" });
      return;
    }

    if (!tenant.isActive) {
      res.status(403).json({ error: "Tenant account is suspended" });
      return;
    }

    req.tenant = {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      plan: tenant.plan,
    };

    next();
  } catch (error) {
    next(error);
  }
}
