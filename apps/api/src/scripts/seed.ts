#!/usr/bin/env tsx
/**
 * CampusFlow Seed Script
 *
 * Usage:
 *   npm run seed --workspace=@campusflow/api -- --slug=mish --name="MISH College" --email=admin@mish.edu --password=YourPassword123
 *
 * `npm run seed` applies pending migrations (`db:deploy`) first so the DB matches Prisma.
 */

import { prisma, Role } from "@campusflow/db";
import bcrypt from "bcryptjs";

function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  for (const arg of process.argv.slice(2)) {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    args[key] = rest.join("=");
  }
  return args;
}

async function main() {
  const args = parseArgs();

  const slug = args["slug"];
  const name = args["name"];
  const email = args["email"];
  const password = args["password"];
  const phone = args["phone"];

  if (!slug || !name || !email || !password) {
    console.error(`
❌ Missing required arguments.

Usage:
  npx tsx src/scripts/seed.ts \\
    --slug=mish \\
    --name="MISH College" \\
    --email=admin@mish.edu \\
    --password=YourPassword123 \\
    --phone=9999999999   (optional)
    `);
    process.exit(1);
  }

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(slug)) {
    console.error("❌ Slug must be lowercase letters, numbers, and hyphens only.");
    process.exit(1);
  }

  console.log(`\n🌱 Seeding CampusFlow...\n`);

  // 1. Create tenant
  const existingTenant = await prisma.tenant.findUnique({ where: { slug } });
  if (existingTenant) {
    console.log(`⚠️  Tenant "${slug}" already exists. Skipping tenant creation.`);
  }

  const tenant = existingTenant ?? await prisma.tenant.create({
    data: { slug, name },
  });

  console.log(`✅ Tenant: ${tenant.name} (${tenant.slug}) — ID: ${tenant.id}`);
  console.log(`🔑 Tenant public key: ${tenant.publicKey}`);

  // 2. Create admin user
  const existingUser = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId: tenant.id, email } },
  });

  if (existingUser) {
    console.log(`⚠️  User "${email}" already exists for this tenant. Skipping.`);
    printSummary(tenant.slug, tenant.publicKey, email, password);
    return;
  }

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

  // 3. Create a default department
  const dept = await prisma.department.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: "GEN" } },
    create: { tenantId: tenant.id, name: "General", code: "GEN" },
    update: {},
  });

  console.log(`✅ Default department: ${dept.name} (${dept.code})`);

  printSummary(tenant.slug, tenant.publicKey, email, password);
}

function printSummary(slug: string, publicKey: string, email: string, password: string) {
  console.log(`
─────────────────────────────────────────
🚀 CampusFlow tenant ready!

  URL:         http://${slug}.localhost:3000
  Public Key:  ${publicKey}
  Email:       ${email}
  Password:    ${password}

  Add to apps/web/.env.local:
  NEXT_PUBLIC_TENANT_KEY=${publicKey}

  (Change the password after first login)
─────────────────────────────────────────
  `);
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
