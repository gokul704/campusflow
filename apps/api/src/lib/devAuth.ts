/**
 * Development / local bypass for OTP + outbound invite email.
 *
 * When active:
 * - `forgotPassword` does not call Redis or send email/SMS (no OTP generated).
 * - `resetPassword` accepts magic OTP {@link DEV_OTP_BYPASS} without Redis.
 * - `createInvite` logs the accept URL instead of sending email.
 *
 * Active when `NODE_ENV !== "production"`, unless `AUTH_REQUIRE_OTP=1`.
 * Optional `SKIP_AUTH_EMAIL_OTP=1` forces bypass even in production (avoid in real deployments).
 */

export const DEV_OTP_BYPASS = "000000";

export function isAuthEmailOtpBypassed(): boolean {
  if (process.env.AUTH_REQUIRE_OTP === "1" || process.env.AUTH_REQUIRE_OTP === "true") {
    return false;
  }
  if (process.env.SKIP_AUTH_EMAIL_OTP === "1" || process.env.SKIP_AUTH_EMAIL_OTP === "true") {
    return true;
  }
  return process.env.NODE_ENV !== "production";
}
