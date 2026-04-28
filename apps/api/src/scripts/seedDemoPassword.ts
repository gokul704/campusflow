/**
 * Single demo password for seed scripts (`seed:data`, `seed:roles`, `seed:maa`).
 *
 * Override (min 8 characters):
 * - `SEED_DEMO_PASSWORD` in repo-root `.env`, or
 * - `--password=...` on `npm run api:seed:roles` / `npm run api:seed:maa` / `npm run api:seed:data`
 *
 * Initial tenant admin from `api:seed` still uses `--email=` / `--password=` you pass there.
 */
export const DEFAULT_SEED_DEMO_PASSWORD = "Demo@123";

export function resolveSeedDemoPassword(cliOverride?: string): string {
  const cli = cliOverride?.trim();
  if (cli && cli.length >= 8) return cli;

  const env = process.env.SEED_DEMO_PASSWORD?.trim();
  if (env && env.length >= 8) return env;

  return DEFAULT_SEED_DEMO_PASSWORD;
}
