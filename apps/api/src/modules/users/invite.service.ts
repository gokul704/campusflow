import { prisma, Role } from "@campusflow/db";
import { redis } from "../../lib/redis";
import { sendEmail } from "../../lib/email";
import { hashPassword } from "../auth/auth.service";
import { randomUUID } from "crypto";

const INVITE_TTL = 48 * 60 * 60; // 48 hours

function inviteKey(token: string) {
  return `invite:${token}`;
}

interface InvitePayload {
  tenantId: string;
  email: string;
  role: Role;
  invitedBy: string;
}

export async function createInvite(
  tenantId: string,
  email: string,
  role: Role,
  invitedBy: string,
  appUrl: string
): Promise<void> {
  // Check if user already exists
  const existing = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId, email } },
  });
  if (existing) throw new Error("User with this email already exists");

  const token = randomUUID();
  const payload: InvitePayload = { tenantId, email, role, invitedBy };

  await redis.set(inviteKey(token), JSON.stringify(payload), { ex: INVITE_TTL });

  const inviteUrl = `${appUrl}/accept-invite?token=${token}`;

  await sendEmail({
    to: email,
    subject: "You're invited to CampusFlow",
    html: `
      <p>Hello,</p>
      <p>You have been invited to join CampusFlow as <strong>${role}</strong>.</p>
      <p>Click the link below to set up your account:</p>
      <p><a href="${inviteUrl}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Accept Invite</a></p>
      <p>This link expires in 48 hours.</p>
    `,
  });
}

export async function acceptInvite(token: string, password: string, firstName: string, lastName: string) {
  const raw = await redis.get<string>(inviteKey(token));
  if (!raw) throw new Error("Invalid or expired invite link");

  const payload: InvitePayload = typeof raw === "string" ? JSON.parse(raw) : raw;

  // Check again in case user was created after invite was sent
  const existing = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId: payload.tenantId, email: payload.email } },
  });
  if (existing) throw new Error("Account already exists. Please login.");

  const hashed = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      tenantId: payload.tenantId,
      email: payload.email,
      password: hashed,
      firstName,
      lastName,
      role: payload.role,
    },
    select: { id: true, email: true, role: true, firstName: true, lastName: true },
  });

  // Consume token
  await redis.del(inviteKey(token));

  return user;
}

export async function getInviteInfo(token: string) {
  const raw = await redis.get<string>(inviteKey(token));
  if (!raw) throw new Error("Invalid or expired invite link");

  const payload: InvitePayload = typeof raw === "string" ? JSON.parse(raw) : raw;
  return { email: payload.email, role: payload.role };
}
