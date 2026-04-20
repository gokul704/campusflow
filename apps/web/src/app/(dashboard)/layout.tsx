import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DashboardGate from "@/components/DashboardGate";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("cf_token");
  if (!token) redirect("/login");

  return (
    <Suspense fallback={null}>
      <DashboardGate token={token.value}>{children}</DashboardGate>
    </Suspense>
  );
}
