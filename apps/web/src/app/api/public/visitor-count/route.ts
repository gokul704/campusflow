import { NextResponse } from "next/server";
import { prisma } from "@campusflow/db";

/** Single row for the MISH public landing page hit counter. */
const MISH_LANDING_COUNTER_ID = "mish-public-landing";

/**
 * POST: atomically increment and return the new total (page views).
 * Returns { count: null } if the database is unavailable so the client can hide the stat.
 */
export async function POST() {
  try {
    const row = await prisma.siteCounter.upsert({
      where: { id: MISH_LANDING_COUNTER_ID },
      create: { id: MISH_LANDING_COUNTER_ID, count: 1 },
      update: { count: { increment: 1 } },
    });
    return NextResponse.json({ count: row.count });
  } catch {
    return NextResponse.json({ count: null as number | null }, { status: 200 });
  }
}
