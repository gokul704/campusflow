import "./globals.css";
import type { Metadata } from "next";
import { Lora } from "next/font/google";

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CampusFlow | MISH",
  description: "CampusFlow portal for MAA Institute of Speech and Hearing (MISH)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${lora.variable} antialiased`}>{children}</body>
    </html>
  );
}
