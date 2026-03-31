"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, CalendarDays,
  BarChart3, ClipboardList, Clock, CheckSquare, BookMarked,
  Layers, Building2, CreditCard, Settings, LogOut, ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface NavItem { label: string; href: string; icon: React.ElementType; }
interface NavGroup { label: string; items: NavItem[]; }

const navGroups: NavGroup[] = [
  {
    label: "Main",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Academic",
    items: [
      { label: "Batch Courses", href: "/dashboard/batch-courses", icon: BookMarked },
      { label: "Timetable", href: "/dashboard/timetable", icon: Clock },
      { label: "Attendance", href: "/dashboard/attendance", icon: CheckSquare },
      { label: "Assignments", href: "/dashboard/assignments", icon: ClipboardList },
      { label: "Exam Grades", href: "/dashboard/exam-grades", icon: BarChart3 },
      { label: "Reports", href: "/dashboard/reports", icon: BarChart3 },
    ],
  },
  {
    label: "People",
    items: [
      { label: "Students", href: "/dashboard/students", icon: GraduationCap },
      { label: "Faculty", href: "/dashboard/faculty", icon: Users },
      { label: "Users", href: "/dashboard/users", icon: Users },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Courses", href: "/dashboard/courses", icon: BookOpen },
      { label: "Batches", href: "/dashboard/batches", icon: Layers },
      { label: "Sections", href: "/dashboard/sections", icon: Layers },
      { label: "Departments", href: "/dashboard/departments", icon: Building2 },
      { label: "Fee Management", href: "/dashboard/fees", icon: CreditCard },
      { label: "Events", href: "/dashboard/events", icon: CalendarDays },
    ],
  },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  function handleLogout() {
    document.cookie = "cf_token=; path=/; max-age=0";
    router.push("/login");
  }

  return (
    <aside className="sticky top-0 flex h-screen w-56 flex-shrink-0 flex-col border-r border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      {/* Logo */}
      <div className="px-5 pb-5 pt-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600 shadow-sm">
            <GraduationCap size={18} className="text-white" />
          </div>
          <div>
            <p className="text-base font-bold leading-tight text-gray-900 dark:text-white">CampusFlow</p>
            <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500">Management Portal</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 overflow-y-auto pb-4 space-y-1">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-2">
            <p className="mb-1 mt-3 px-3 text-[9px] font-bold uppercase tracking-widest text-gray-400 first:mt-0 dark:text-gray-500">
              {group.label}
            </p>
            {group.items.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all
                    ${active
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-200/50 dark:shadow-blue-900/40"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                    }`}
                >
                  <Icon size={16} className={active ? "text-white" : "text-gray-400 dark:text-gray-500"} />
                  <span className="truncate flex-1">{item.label}</span>
                  {active && <ChevronRight size={13} className="text-blue-200 flex-shrink-0" />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="space-y-0.5 border-t border-gray-100 px-3 pb-5 pt-3 dark:border-gray-800">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-500 transition-all hover:bg-gray-50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
        >
          <Settings size={16} className="text-gray-400 dark:text-gray-500" />
          Settings
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-500 transition-all hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400"
        >
          <LogOut size={16} className="text-gray-400 dark:text-gray-500" />
          Logout
        </button>
      </div>
    </aside>
  );
}
