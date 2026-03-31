import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import SidebarNav from "@/components/SidebarNav";
import TopHeader from "@/components/TopHeader";

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
    <div className="h-screen flex overflow-hidden bg-indigo-50 text-gray-900 transition-colors dark:bg-gray-950 dark:text-white">
      <SidebarNav />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <TopHeader token={token.value} />
        <main className="min-h-0 flex-1 overflow-auto p-5 dark:bg-gray-950">
          {children}
        </main>
      </div>
    </div>
  );
}
