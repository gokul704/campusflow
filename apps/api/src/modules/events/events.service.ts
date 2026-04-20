import { prisma } from "@campusflow/db";

export async function listEvents(
  tenantId: string,
  filters: { from?: string; to?: string }
) {
  const dateFilter: Record<string, Date> = {};
  if (filters.from) dateFilter.gte = new Date(filters.from);
  if (filters.to) dateFilter.lte = new Date(filters.to);

  return prisma.event.findMany({
    where: {
      tenantId,
      ...(Object.keys(dateFilter).length > 0 ? { startDate: dateFilter } : {}),
    },
    orderBy: { startDate: "asc" },
  });
}

export async function createEvent(
  tenantId: string,
  data: {
    title: string;
    description?: string;
    startDate: string;
    endDate?: string;
    eventType?: string;
  }
) {
  return prisma.event.create({
    data: {
      tenantId,
      title: data.title,
      description: data.description,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      eventType: (data.eventType as never) ?? "EVENT",
    },
  });
}

export async function updateEvent(
  tenantId: string,
  id: string,
  data: {
    title?: string;
    description?: string;
    startDate?: string;
    endDate?: string | null;
    eventType?: string;
  }
) {
  const record = await prisma.event.findFirst({ where: { id, tenantId } });
  if (!record) throw new Error("Event not found");
  return prisma.event.update({
    where: { id },
    data: {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : data.endDate === null ? null : undefined,
      eventType: data.eventType as never,
    },
  });
}

export async function deleteEvent(tenantId: string, id: string) {
  const record = await prisma.event.findFirst({ where: { id, tenantId } });
  if (!record) throw new Error("Event not found");
  return prisma.event.delete({ where: { id } });
}

export async function bulkCreateEvents(
  tenantId: string,
  rows: Array<{
    title: string;
    startDate: string;
    endDate?: string | null;
    description?: string | null;
    eventType?: string | null;
  }>
) {
  const failed: { index: number; error: string }[] = [];
  let created = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    try {
      await createEvent(tenantId, {
        title: row.title.trim(),
        description: row.description?.trim() || undefined,
        startDate: row.startDate,
        endDate: row.endDate?.trim() || undefined,
        eventType: row.eventType?.trim() || "EVENT",
      });
      created++;
    } catch (e) {
      failed.push({ index: i, error: e instanceof Error ? e.message : "Failed" });
    }
  }
  return { created, failed };
}
