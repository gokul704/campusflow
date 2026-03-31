import { prisma } from "@campusflow/db";

export async function listNotifications(tenantId: string, userId: string) {
  return prisma.notification.findMany({
    where: { tenantId, userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function createNotification(
  tenantId: string,
  userId: string,
  title: string,
  body: string,
  link?: string
) {
  return prisma.notification.create({
    data: { tenantId, userId, title, body, link },
  });
}

export async function markRead(tenantId: string, userId: string, id: string) {
  const record = await prisma.notification.findFirst({ where: { id, tenantId, userId } });
  if (!record) throw new Error("Notification not found");
  return prisma.notification.update({ where: { id }, data: { isRead: true } });
}

export async function markAllRead(tenantId: string, userId: string) {
  return prisma.notification.updateMany({
    where: { tenantId, userId, isRead: false },
    data: { isRead: true },
  });
}

export async function getUnreadCount(tenantId: string, userId: string) {
  return prisma.notification.count({ where: { tenantId, userId, isRead: false } });
}
