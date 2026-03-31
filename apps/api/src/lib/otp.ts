import { redis } from "./redis";

const OTP_TTL_SECONDS = 10 * 60; // 10 minutes

function otpKey(tenantId: string, email: string) {
  return `otp:${tenantId}:${email}`;
}

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createOtp(tenantId: string, email: string): Promise<string> {
  const code = generateOtp();
  await redis.set(otpKey(tenantId, email), code, { ex: OTP_TTL_SECONDS });
  return code;
}

export async function verifyOtp(
  tenantId: string,
  email: string,
  code: string
): Promise<boolean> {
  const key = otpKey(tenantId, email);
  const stored = await redis.get<string>(key);

  if (!stored || stored !== code) return false;

  // Delete immediately — one-time use
  await redis.del(key);
  return true;
}
