import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Lora } from "next/font/google";

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MAA Education portal | MISH",
  description: "MAA Education portal for MAA Institute of Speech and Hearing (MISH)",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${lora.variable} antialiased`}>{children}</body>
    </html>
  );
}
