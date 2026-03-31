/**
 * MSG91 SMS integration
 * Docs: https://docs.msg91.com/reference/send-sms
 */

interface SendSmsOptions {
  to: string;
  message: string;
}

export async function sendSms({ to, message }: SendSmsOptions): Promise<void> {
  const authKey = process.env.MSG91_AUTH_KEY;
  const senderId = process.env.MSG91_SENDER_ID ?? "CAMPFL";

  if (!authKey) {
    // Dev mode — just log the OTP
    console.log(`[SMS DEV] To: ${to} | Message: ${message}`);
    return;
  }

  const res = await fetch("https://api.msg91.com/api/v5/otp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      authkey: authKey,
    },
    body: JSON.stringify({
      template_id: process.env.MSG91_OTP_TEMPLATE_ID,
      mobile: `91${to}`,
      authkey: authKey,
      otp: message,
      sender: senderId,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[SMS] Failed to send:", body);
    // Don't throw — SMS failure shouldn't break the flow
  }
}
