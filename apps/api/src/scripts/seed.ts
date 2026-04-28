#!/usr/bin/env tsx
/**
 * MAA Education portal — bootstrap tenant + admin (first install), or touch an existing institute only.
 *
 * New institute (tenant row does not exist yet):
 *   npm run api:seed -- --slug=mish --name="MISH College" --email=admin@mish.edu --password=YourPassword123
 *   Tip: use the same password as `SEED_DEMO_PASSWORD` / `seedDemoPassword.ts` default so admin matches `api:seed:data` & `api:seed:roles` users.
 *   Slug may be omitted if SINGLE_TENANT_SLUG is set (or exactly one tenant exists — rare for empty DB).
 *
 * Existing institute only (no new tenant, no new admin unless missing):
 *   npm run api:seed --   # with SINGLE_TENANT_SLUG=mish (or one tenant in DB)
 *   Ensures default department GEN. Add --email= --password= to create admin if none yet.
 *
 * Never creates a second tenant when one already exists for the resolved slug.
 * Pass --existing-only=true to abort if the tenant does not exist (safety for CI/scripts).
 *
 * `npm run seed` runs `db:deploy` first so the database matches Prisma.
 */

import { prisma, Role } from "@campusflow/db";
import bcrypt from "bcryptjs";
import {
  printStandaloneSlugHint,
  printTenantSlugResolutionFailure,
  resolveTenantSlugForSeed,
} from "./resolveTenantSlugForSeed";

function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  for (const arg of process.argv.slice(2)) {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    args[key] = rest.join("=");
  }
  return args;
}

function truthy(v: string | undefined): boolean {
  return v === "1" || v === "true" || v === "yes";
}

function printSummary(
  slug: string,
  publicKey: string,
  creds?: { email: string; password: string }
) {
  const credLines =
    creds != null
      ? `  Email:       ${creds.email}
  Password:    ${creds.password}

  (Change the password after first login)`
      : `  Admin:       not created this run (pass --email= and --password= to add one)`;

  console.log(`
─────────────────────────────────────────
🚀 MAA Education portal tenant ready!

  Web app:     http://localhost:3000
  API:         http://localhost:4000
  Slug:        ${slug}
  Public Key:  ${publicKey}  (optional x-tenant-key for tooling)

${credLines}

  Add to repo-root .env (same file the API loads):
  SINGLE_TENANT_SLUG=${slug}
─────────────────────────────────────────
  `);
}

async function main() {
  const args = parseArgs();

  const slug = await resolveTenantSlugForSeed(args["slug"]);
  if (!slug) {
    console.error("❌ Could not determine tenant slug.");
    printStandaloneSlugHint();
    await printTenantSlugResolutionFailure();
    process.exit(1);
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    console.error("❌ Slug must be lowercase letters, numbers, and hyphens only.");
    process.exit(1);
  }

  const name = args["name"];
  const email = args["email"];
  const password = args["password"];
  const phone = args["phone"];
  const existingOnly = truthy(args["existing-only"]);

  console.log(`\n🌱 Seeding MAA Education portal...\n`);

  const existingTenant = await prisma.tenant.findUnique({ where: { slug } });

  if (!existingTenant) {
    if (existingOnly) {
      console.error(
        `❌ No tenant with slug "${slug}" (--existing-only: will not create an institute).`
      );
      printStandaloneSlugHint();
      process.exit(1);
    }
    if (!name || !email || !password) {
      console.error(`
❌ No tenant "${slug}" yet — first install requires a new institute:

  npm run api:seed -- --slug=${slug} --name="Your Institute" --email=admin@example.edu --password=YourPassword123

  (Or set SINGLE_TENANT_SLUG and pass the same flags.)
`);
      process.exit(1);
    }

    const tenant = await prisma.tenant.create({
      data: { slug, name },
    });
    console.log(`✅ Created tenant: ${tenant.name} (${tenant.slug}) — ID: ${tenant.id}`);
    console.log(`🔑 Tenant public key: ${tenant.publicKey}`);

    await ensureGenDepartment(tenant.id);

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email,
        phone: phone ?? null,
        password: hashedPassword,
        firstName: "Admin",
        lastName: tenant.name,
        role: Role.ADMIN,
      },
    });
    console.log(`✅ Admin user: ${user.email} (${user.role})`);
    printSummary(tenant.slug, tenant.publicKey, { email, password });
    return;
  }

  // ── Existing tenant: never create another institute ─────────────────
  console.log(`✅ Using existing tenant: ${existingTenant.name} (${slug}) — ID: ${existingTenant.id}`);
  console.log(`🔑 Tenant public key: ${existingTenant.publicKey}`);

  await ensureGenDepartment(existingTenant.id);

  if (!email || !password) {
    console.log(`✅ Default department ensured (GEN). No --email/--password: skipped admin user.`);
    printSummary(existingTenant.slug, existingTenant.publicKey);
    return;
  }

  const existingUser = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId: existingTenant.id, email } },
  });

  if (existingUser) {
    console.log(`⚠️  User "${email}" already exists for this tenant. Skipping admin create.`);
    printSummary(existingTenant.slug, existingTenant.publicKey, { email, password });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      tenantId: existingTenant.id,
      email,
      phone: phone ?? null,
      password: hashedPassword,
      firstName: "Admin",
      lastName: existingTenant.name,
      role: Role.ADMIN,
    },
  });
  console.log(`✅ Admin user: ${user.email} (${user.role})`);
  printSummary(existingTenant.slug, existingTenant.publicKey, { email, password });
}

async function ensureGenDepartment(tenantId: string) {
  const dept = await prisma.department.upsert({
    where: { tenantId_code: { tenantId, code: "GEN" } },
    create: { tenantId, name: "General", code: "GEN" },
    update: {},
  });
  console.log(`✅ Default department: ${dept.name} (${dept.code})`);
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
