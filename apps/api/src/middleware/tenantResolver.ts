import { Request, Response, NextFunction } from "express";
import { prisma } from "@campusflow/db";

const tenantSelect = {
  id: true,
  slug: true,
  name: true,
  plan: true,
  isActive: true,
  accessMatrix: true,
} as const;

type TenantRow = {
  id: string;
  slug: string;
  name: string;
  plan: string;
  isActive: boolean;
  accessMatrix?: unknown | null;
};

/**
 * Resolves the active institute (tenant) for this request.
 *
 * Standalone / single-tenant default (no browser headers required):
 * - `SINGLE_TENANT_SLUG` or `SINGLE_TENANT_ID` in `.env` at repo root, or
 * - exactly one row in `tenants`, or
 * - optional `x-tenant-key` (tenant `publicKey`) for tooling / overrides
 *
 * Optional multi-host: subdomain on `Host` (e.g. mish.example.com → slug `mish`),
 * skipped for localhost and bare IPv4.
 */
export async function tenantResolver(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let tenant: TenantRow | null = null;

    const tenantKey = req.headers["x-tenant-key"];
    if (tenantKey && typeof tenantKey === "string") {
      tenant = await prisma.tenant.findUnique({
        where: { publicKey: tenantKey },
        select: tenantSelect,
      });
    }

    if (!tenant) {
      const host = req.hostname;
      const isIpv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
      if (!isIpv4 && host !== "localhost") {
        const parts = host.split(".");
        if (parts.length >= 3 && parts[0] && parts[0] !== "www") {
          const slug = parts[0];
          tenant = await prisma.tenant.findUnique({
            where: { slug },
            select: tenantSelect,
          });
        }
      }
    }

    const slugEnv = process.env.SINGLE_TENANT_SLUG?.trim();
    if (!tenant && slugEnv) {
      const bySlug = await prisma.tenant.findUnique({
        where: { slug: slugEnv },
        select: tenantSelect,
      });
      if (!bySlug) {
        res.status(400).json({
          error: "Unable to identify tenant",
          message: `No tenant with slug "${slugEnv}". Fix SINGLE_TENANT_SLUG in .env to match your institute (see npm run seed -- --slug=...).`,
        });
        return;
      }
      tenant = bySlug;
    }

    const idEnv = process.env.SINGLE_TENANT_ID?.trim();
    if (!tenant && idEnv) {
      const byId = await prisma.tenant.findUnique({
        where: { id: idEnv },
        select: tenantSelect,
      });
      if (!byId) {
        res.status(400).json({
          error: "Unable to identify tenant",
          message: "SINGLE_TENANT_ID in .env does not match any tenant.",
        });
        return;
      }
      tenant = byId;
    }

    if (!tenant) {
      const candidates = await prisma.tenant.findMany({
        take: 2,
        orderBy: { createdAt: "asc" },
        select: tenantSelect,
      });
      if (candidates.length === 1) {
        tenant = candidates[0]!;
      }
    }

    if (!tenant) {
      res.status(400).json({
        error: "Unable to identify tenant",
        message:
          "Set SINGLE_TENANT_SLUG in .env (same value as npm run seed -- --slug=...), or ensure only one institute exists in the database. Optional: x-tenant-key header with the tenant public key.",
      });
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
      accessMatrix: tenant.accessMatrix ?? null,
    };

    next();
  } catch (error) {
    next(error);
  }
}
