#!/usr/bin/env tsx
/**
 * Creates one demo user per Role for an existing tenant (for QA / demos).
 *
 * Usage:
 *   npm run api:seed:roles -- --slug=mish
 *   npm run api:seed:roles   (uses SINGLE_TENANT_SLUG or the only tenant in DB)
 *
 * Requires `npm run seed` (or an existing tenant) first.
 *
 * Emails: `{slug}.{key}@roles.demo` — see ROLE_ROWS in this file for keys (admin-portal, cmd, …).
 * `roles.demo` is not a real mailbox — demo login only.
 *
 * Password: one shared value for ALL accounts — see `resolveSeedDemoPassword` in `seedDemoPassword.ts`
 *   (default `CampusFlowDemo@2026`, or `SEED_DEMO_PASSWORD` in .env, or `--password=...`).
 *
 * Guest student accounts are seeded like other users; workshop/library limits
 * are enforced in API routes when you add GUEST_STUDENT checks.
 */

import { prisma, Role } from "@campusflow/db";
import bcrypt from "bcryptjs";
import {
  printStandaloneSlugHint,
  printTenantSlugResolutionFailure,
  resolveTenantSlugForSeed,
} from "./resolveTenantSlugForSeed";
import { resolveSeedDemoPassword } from "./seedDemoPassword";

function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  for (const arg of process.argv.slice(2)) {
    if (!arg.startsWith("--")) continue;
    const [key, ...rest] = arg.slice(2).split("=");
    args[key] = rest.join("=");
  }
  return args;
}

type Row = { role: Role; key: string; firstName: string; lastName: string };

/**
 * One user per Role — realistic names for an institute (demo / QA).
 * Guest student: role only here; workshop + library access stays a future route guard.
 */
const ROLE_ROWS: Row[] = [
  // Admin
  { role: Role.ADMIN, key: "admin-portal", firstName: "Lakshmi", lastName: "Venkatesh" },
  // Leadership
  { role: Role.CMD, key: "cmd", firstName: "Dr. Suresh", lastName: "Ramachandran" },
  { role: Role.PRINCIPAL, key: "principal", firstName: "Dr. Deepa", lastName: "Krishnamurthy" },
  // Staff
  { role: Role.ASSISTANT_PROFESSOR, key: "assistant-professor", firstName: "Anitha", lastName: "Mohan" },
  { role: Role.PROFESSOR, key: "professor", firstName: "Karthik", lastName: "Subramanian" },
  { role: Role.CLINICAL_STAFF, key: "clinical-staff", firstName: "Meera", lastName: "Krishnan" },
  { role: Role.GUEST_PROFESSOR, key: "guest-professor", firstName: "Divya", lastName: "Ramesh" },
  { role: Role.OPERATIONS, key: "operations", firstName: "Priya", lastName: "Nair" },
  { role: Role.ACCOUNTS, key: "accounts", firstName: "Arvind", lastName: "Iyer" },
  { role: Role.IT_STAFF, key: "it-staff", firstName: "Nikhil", lastName: "Rao" },
  // Students
  { role: Role.STUDENT, key: "student", firstName: "Arjun", lastName: "Venkatesh" },
  { role: Role.ALUMNI, key: "alumni", firstName: "Sanjay", lastName: "Iyer" },
  { role: Role.GUEST_STUDENT, key: "guest", firstName: "Neha", lastName: "Kapoor" },
];

async function main() {
  const args = parseArgs();
  const slug = await resolveTenantSlugForSeed(args["slug"]);
  const password = resolveSeedDemoPassword(args["password"]);

  if (!slug) {
    console.error(`
Usage:
  npm run api:seed:roles -- --slug=mish
  npm run api:seed:roles -- --slug=mish --password=YourDemoPass123
  (or set SEED_DEMO_PASSWORD in .env — see seedDemoPassword.ts)
  npm run api:seed:roles   (with SINGLE_TENANT_SLUG in .env, or exactly one tenant in DB)

  Or: npm run seed:roles --workspace=@campusflow/api -- --slug=mish
`);
    printStandaloneSlugHint();
    await printTenantSlugResolutionFailure();
    process.exit(1);
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) {
    console.error(`❌ Tenant "${slug}" not found. Run npm run api:seed first with the same slug.`);
    process.exit(1);
  }

  const hashed = await bcrypt.hash(password, 12);
  console.log(`\n🌱 Seeding role demo users for: ${tenant.name} (${slug})\n`);

  const seededLines: string[] = [];

  for (const row of ROLE_ROWS) {
    const email = `${slug}.${row.key}@roles.demo`;
    await prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email } },
      create: {
        tenantId: tenant.id,
        email,
        password: hashed,
        firstName: row.firstName,
        lastName: row.lastName,
        role: row.role,
      },
      update: {
        password: hashed,
        firstName: row.firstName,
        lastName: row.lastName,
        role: row.role,
        isActive: true,
      },
    });
    const display = `${row.firstName} ${row.lastName}`.padEnd(28);
    console.log(`  ✅ ${row.role.padEnd(24)} ${display} ${email}`);
    seededLines.push(`${email}  |  ${password}`);
  }

  console.log(`
────────────────────────────────────────────────────────────
Login (same password for every account below)
Password: ${password}

${seededLines.join("\n")}
────────────────────────────────────────────────────────────
Tenant public key: ${tenant.publicKey}  (optional x-tenant-key)
  SINGLE_TENANT_SLUG=${slug}  in repo-root .env for standalone mode

Demo only — use real emails + unique passwords in production.
────────────────────────────────────────────────────────────
`);
}

main()
  .catch((e) => {
    console.error("❌ seed-role-users failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
