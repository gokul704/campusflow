import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@campusflow/db";
import { createOtp, verifyOtp } from "../../lib/otp";
import { sendSms } from "../../lib/sms";
import { sendEmail } from "../../lib/email";
import { DEV_OTP_BYPASS, isAuthEmailOtpBypassed } from "../../lib/devAuth";

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

  const token = signToken(user.id, user.tenantId, user.email, user.role, user.firstName, user.lastName);

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

  if (isAuthEmailOtpBypassed()) {
    console.log(
      `[AUTH DEV] Forgot password: skipped email/SMS and OTP storage. Reset with OTP ${DEV_OTP_BYPASS} (set AUTH_REQUIRE_OTP=1 to use real OTP flow).`
    );
    return;
  }

  const otp = await createOtp(tenantId, email);

  // Send via SMS if phone available, else email
  if (user.phone) {
    await sendSms({
      to: user.phone,
      message: `Your MAA Education portal password reset OTP is ${otp}. Valid for 10 minutes. Do not share with anyone.`,
    });
  } else {
    await sendEmail({
      to: email,
      subject: "MAA Education portal — Password Reset OTP",
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
  const bypass = isAuthEmailOtpBypassed() && otp === DEV_OTP_BYPASS;
  if (!bypass) {
    const valid = await verifyOtp(tenantId, email, otp);
    if (!valid) {
      throw new Error("Invalid or expired OTP");
    }
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
): Promise<{ message: string; token: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) throw new Error("Current password is incorrect");

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

  const token = signToken(user.id, user.tenantId, user.email, user.role, user.firstName, user.lastName);
  return { message: "Password changed successfully.", token };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

function signToken(
  userId: string,
  tenantId: string,
  email: string,
  role: string,
  firstName: string,
  lastName: string
) {
  return jwt.sign(
    { userId, tenantId, email, role, firstName, lastName },
    process.env.JWT_SECRET!,
    { expiresIn: 60 * 60 * 24 * 7 } // 7 days
  );
}

export async function getMeProfile(userId: string, tenantId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId },
    select: {
      id: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      role: true,
      dateOfBirth: true,
      isActive: true,
      student: { select: { rollNumber: true, batch: { select: { name: true } } } },
      faculty: { select: { designation: true, department: { select: { name: true, code: true } } } },
    },
  });
  if (!user) throw new Error("User not found");

  const designation = user.faculty?.designation ?? null;
  const levelLabel = user.faculty
    ? `${user.faculty.department.name} (${user.faculty.department.code})`
    : user.student
      ? `${user.student.batch.name} · Roll ${user.student.rollNumber}`
      : null;

  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    dateOfBirth: user.dateOfBirth,
    isActive: user.isActive,
    designation,
    levelLabel,
  };
}

export type PortalRestrictionSource = "manual" | "fee" | null;

export async function getPortalAccessState(userId: string, tenantId: string): Promise<{
  portalAccessRestricted: boolean;
  portalRestrictionReason: string | null;
  portalRestrictionSource: PortalRestrictionSource;
}> {
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId },
    include: { student: { select: { id: true } } },
  });
  if (!user) throw new Error("User not found");

  const now = new Date();
  const overrideActive = user.feeAccessOverrideUntil != null && user.feeAccessOverrideUntil > now;

  let feeLocked = false;
  if (user.student?.id) {
    feeLocked =
      (await prisma.feePayment.count({
        where: {
          tenantId,
          studentId: user.student.id,
          status: "PENDING",
          feeStructure: { dueDate: { lt: now } },
        },
      })) > 0;
  }

  const manual = user.portalAccessRestricted;
  const restricted = !overrideActive && (manual || feeLocked);
  let reason: string | null = null;
  let source: PortalRestrictionSource = null;
  if (restricted) {
    if (manual) {
      source = "manual";
      const r = user.portalRestrictionReason?.trim();
      reason = r && r.length > 0 ? r : "Portal access has been suspended by the institute.";
    } else if (feeLocked) {
      source = "fee";
      reason = "Fee payment is overdue. Please visit Fee Management.";
    }
  }

  return { portalAccessRestricted: restricted, portalRestrictionReason: reason, portalRestrictionSource: source };
}

export async function updateOwnProfile(
  userId: string,
  tenantId: string,
  data: { firstName?: string; lastName?: string; phone?: string | null }
) {
  const user = await prisma.user.findFirst({ where: { id: userId, tenantId } });
  if (!user) throw new Error("User not found");

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.firstName !== undefined ? { firstName: data.firstName } : {}),
      ...(data.lastName !== undefined ? { lastName: data.lastName } : {}),
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
    },
    select: {
      id: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      role: true,
    },
  });

  const token = signToken(
    updated.id,
    tenantId,
    updated.email,
    updated.role,
    updated.firstName,
    updated.lastName
  );

  return { ...updated, token };
}
