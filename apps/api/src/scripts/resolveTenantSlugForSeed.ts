import { prisma } from "@campusflow/db";

/**
 * Single-tenant / standalone: resolve which institute slug seeds should target.
 *
 * Order: explicit `--slug=` → `SINGLE_TENANT_SLUG` in .env → exactly one row in `tenants`.
 */
export async function resolveTenantSlugForSeed(
  explicitFromArgs?: string | undefined
): Promise<string | null> {
  const fromArg = explicitFromArgs?.trim();
  if (fromArg) return fromArg;

  const fromEnv = process.env.SINGLE_TENANT_SLUG?.trim();
  if (fromEnv) return fromEnv;

  const count = await prisma.tenant.count();
  if (count === 1) {
    const row = await prisma.tenant.findFirstOrThrow({
      orderBy: { createdAt: "asc" },
      select: { slug: true },
    });
    return row.slug;
  }

  return null;
}

export function printStandaloneSlugHint(): void {
  console.error(`
Standalone: use one institute slug everywhere.

  • Set SINGLE_TENANT_SLUG=your-slug in repo-root .env
    (same file dotenv loads: campusflow/.env — not only .env.example)

  • Or pass --slug=your-slug on this command.

  If the database has exactly one tenant, that slug is used automatically.
`);
}

/** When slug resolution returns null: explain empty DB vs multiple tenants. */
export async function printTenantSlugResolutionFailure(): Promise<void> {
  const count = await prisma.tenant.count();
  if (count === 0) {
    console.error(`
  No rows in table "tenants". First create an institute:

    npm run api:seed -- --slug=mish --name="MISH College" --email=admin@mish.edu --password=YourPassword123
`);
    return;
  }

  const rows = await prisma.tenant.findMany({
    orderBy: { createdAt: "asc" },
    select: { slug: true, name: true },
  });
  console.error(
    `\n  Found ${count} tenants — cannot guess which one to use without SINGLE_TENANT_SLUG or --slug=:\n`
  );
  for (const r of rows) {
    console.error(`    • ${r.slug} — ${r.name}`);
  }
  console.error(`
  Fix: add to repo-root .env (then re-run):

    SINGLE_TENANT_SLUG=mish

  Or pass on the command line:

    npm run api:seed -- --slug=mish
    npm run seed:maa -- --slug=mish

  (Use the slug for the institute you want; remove extra tenants in Prisma Studio if you only want one.)
`);
}
