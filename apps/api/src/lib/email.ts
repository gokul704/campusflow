import { Resend } from "resend";

// Resend free tier: must use onboarding@resend.dev until you verify a domain
const FROM = process.env.EMAIL_FROM ?? "CampusFlow <onboarding@resend.dev>";

function getClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<void> {
  const client = getClient();

  // Dev mode — always log to console, skip real sending
  if (!client || process.env.NODE_ENV !== "production") {
    console.log("\n─────────────────────────────────────────");
    console.log(`📧 EMAIL (dev mode — not actually sent)`);
    console.log(`   To:      ${to}`);
    console.log(`   Subject: ${subject}`);
    // Extract hrefs so URLs aren't lost when stripping tags
    const links = [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
    const bodyText = html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    console.log(`   Body: ${bodyText}`);
    if (links.length) console.log(`   Links:\n${links.map(l => `     → ${l}`).join("\n")}`);
    console.log("─────────────────────────────────────────\n");
    return;
  }

  const { data, error } = await client.emails.send({ from: FROM, to, subject, html });
  if (error) {
    console.error("[EMAIL] Resend error:", error);
    throw new Error(error.message);
  }
  console.log(`[EMAIL] Sent to ${to} — id: ${data?.id}`);
}
