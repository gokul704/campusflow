import { prisma } from "@campusflow/db";

export async function createTenant(data: {
  name: string;
  slug: string;
  domain?: string;
}) {
  const existing = await prisma.tenant.findUnique({ where: { slug: data.slug } });
  if (existing) {
    throw new Error(`Slug "${data.slug}" is already taken`);
  }

  return prisma.tenant.create({ data });
}

export async function getTenantBySlug(slug: string) {
  return prisma.tenant.findUnique({ where: { slug } });
}

export async function listTenants() {
  return prisma.tenant.findMany({ orderBy: { createdAt: "desc" } });
}
