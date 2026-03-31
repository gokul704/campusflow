import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@campusflow/db";
import { createOtp, verifyOtp } from "../../lib/otp";
import { sendSms } from "../../lib/sms";
import { sendEmail } from "../../lib/email";

export async function login(tenantId: string, email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId, email } },
  });

  if (!user || !user.isActive) {
    throw new Error("Invalid credentials");
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw new Error("Invalid credentials");
  }

  const token = signToken(user.id, user.tenantId, user.email, user.role);

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
  };
}

export async function forgotPassword(tenantId: string, email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId, email } },
  });

  // Always return success to prevent email enumeration
  if (!user || !user.isActive) return;

  const otp = await createOtp(tenantId, email);

  // Send via SMS if phone available, else email
  if (user.phone) {
    await sendSms({
      to: user.phone,
      message: `Your CampusFlow password reset OTP is ${otp}. Valid for 10 minutes. Do not share with anyone.`,
    });
  } else {
    await sendEmail({
      to: email,
      subject: "CampusFlow — Password Reset OTP",
      html: `
        <p>Hello ${user.firstName},</p>
        <p>Your password reset OTP is: <strong>${otp}</strong></p>
        <p>Valid for 10 minutes. Do not share this with anyone.</p>
      `,
    });
  }
}

export async function resetPassword(
  tenantId: string,
  email: string,
  otp: string,
  newPassword: string
): Promise<void> {
  const valid = await verifyOtp(tenantId, email, otp);
  if (!valid) {
    throw new Error("Invalid or expired OTP");
  }

  const hashed = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { tenantId_email: { tenantId, email } },
    data: { password: hashed },
  });
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) throw new Error("Current password is incorrect");

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

function signToken(userId: string, tenantId: string, email: string, role: string) {
  return jwt.sign(
    { userId, tenantId, email, role },
    process.env.JWT_SECRET!,
    { expiresIn: 60 * 60 * 24 * 7 } // 7 days
  );
}
