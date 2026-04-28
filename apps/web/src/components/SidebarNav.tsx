"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, CalendarDays,
  BarChart3, ClipboardList, Clock, CheckSquare, BookMarked,
  Layers, Building2, CreditCard, Settings, LogOut, ChevronRight, Wrench,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/api";
import { isLeadershipRole } from "@/lib/leadershipRoles";

interface NavItem { label: string; href: string; icon: React.ElementType; module: string; }
interface NavGroup { label: string; items: NavItem[]; }

const navGroups: NavGroup[] = [
  {
    label: "Main",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, module: "dashboard" },
      { label: "Onboarding", href: "/dashboard/onboarding", icon: Wrench, module: "onboarding" },
    ],
  },
  {
    label: "Academic",
    items: [
      { label: "Batch Courses", href: "/dashboard/batch-courses", icon: BookMarked, module: "batchCourses" },
      { label: "Timetable", href: "/dashboard/timetable", icon: Clock, module: "timetable" },
      { label: "Attendance", href: "/dashboard/attendance", icon: CheckSquare, module: "attendance" },
      { label: "Assignments", href: "/dashboard/assignments", icon: ClipboardList, module: "assignments" },
      { label: "Exam Grades", href: "/dashboard/exam-grades", icon: BarChart3, module: "examGrades" },
      { label: "Reports", href: "/dashboard/reports", icon: BarChart3, module: "reports" },
    ],
  },
  {
    label: "People",
    items: [
      { label: "Students", href: "/dashboard/students", icon: GraduationCap, module: "students" },
      { label: "Faculty", href: "/dashboard/faculty", icon: Users, module: "faculty" },
      { label: "Users", href: "/dashboard/users", icon: Users, module: "users" },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Courses", href: "/dashboard/courses", icon: BookOpen, module: "courses" },
      { label: "Batches", href: "/dashboard/batches", icon: Layers, module: "batches" },
      { label: "Departments", href: "/dashboard/departments", icon: Building2, module: "departments" },
      { label: "Fee Management", href: "/dashboard/fees", icon: CreditCard, module: "fees" },
      { label: "Events", href: "/dashboard/events", icon: CalendarDays, module: "events" },
    ],
  },
  {
    label: "Library",
    items: [
      { label: "Digital Library", href: "/dashboard/digital-library", icon: BookOpen, module: "digitalLibrary" },
    ],
  },
];

type PermCell = { view: boolean; create: boolean; edit: boolean; delete: boolean };
type ModulesMap = Record<string, PermCell>;

export default function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [modules, setModules] = useState<ModulesMap | null>(null);
  const [userRole, setUserRole] = useState("");
  const [logoBroken, setLogoBroken] = useState(false);
  const sidebarLogoSrc = "https://mish.co.in/images/logo/mish-logo.png";

  useEffect(() => {
    authFetch("/api/auth/permissions")
      .then(async (r) => {
        const d = await r.json().catch(() => null);
        if (r.ok && d?.modules && typeof d.modules === "object") setModules(d.modules as ModulesMap);
        else setModules(null);
      })
      .catch(() => setModules(null));

    authFetch("/api/auth/me")
      .then(async (r) => {
        const d = await r.json().catch(() => null);
        setUserRole(typeof d?.user?.role === "string" ? d.user.role : "");
      })
      .catch(() => setUserRole(""));
  }, []);

  const normalizedRole = userRole.toUpperCase();
  const roleDefaultModules = useMemo(() => {
    if (!normalizedRole) return null;
    const leadershipRoles = new Set(["ADMIN", "CMD", "PRINCIPAL"]);
    if (leadershipRoles.has(normalizedRole)) {
      return new Set([
        "dashboard",
        "onboarding",
        "batchCourses",
        "timetable",
        "attendance",
        "assignments",
        "examGrades",
        "reports",
        "students",
        "faculty",
        "users",
        "courses",
        "batches",
        "departments",
        "fees",
        "events",
        "digitalLibrary",
        "settings",
      ]);
    }
    const facultyRoles = new Set(["ASSISTANT_PROFESSOR", "PROFESSOR", "CLINICAL_STAFF", "GUEST_PROFESSOR"]);
    if (facultyRoles.has(normalizedRole)) {
      return new Set([
        "dashboard",
        "batchCourses",
        "timetable",
        "assignments",
        "examGrades",
        "reports",
        "students",
        "events",
        "digitalLibrary",
        "settings",
      ]);
    }
    const studentRoles = new Set(["STUDENT", "GUEST_STUDENT"]);
    if (studentRoles.has(normalizedRole)) {
      return new Set([
        "dashboard",
        "attendance",
        "assignments",
        "examGrades",
        "fees",
        "events",
        "digitalLibrary",
        "settings",
      ]);
    }
    return new Set(["dashboard", "settings"]);
  }, [normalizedRole]);

  const filteredGroups = useMemo(() => {
    const leadershipRoles = new Set(["ADMIN", "CMD", "PRINCIPAL"]);
    const showAdministration = leadershipRoles.has(normalizedRole);
    return navGroups
      .filter((group) => (group.label === "Administration" ? showAdministration : true))
      .map((group) => ({
        ...group,
        items: group.items
          .filter((item) => {
            if (!modules && !roleDefaultModules) return true;
            const cell = modules?.[item.module];
            if (cell !== undefined) {
              const roleAllows = roleDefaultModules ? roleDefaultModules.has(item.module) : true;
              return cell.view === true && roleAllows;
            }
            return roleDefaultModules?.has(item.module) ?? false;
          })
          .map((item) => {
            const teaching = new Set(["ASSISTANT_PROFESSOR", "PROFESSOR", "CLINICAL_STAFF", "GUEST_PROFESSOR"]);
            if (item.module === "batchCourses" && teaching.has(normalizedRole)) {
              return { ...item, label: "My courses" };
            }
            return item;
          }),
      }))
      .filter((g) => g.items.length > 0);
  }, [modules, roleDefaultModules]);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  function handleLogout() {
    document.cookie = "cf_token=; path=/; max-age=0";
    document.documentElement.classList.remove("dark");
    localStorage.setItem("cf_theme", "light");
    router.push("/login");
  }

  return (
    <aside className="sticky top-0 flex h-screen w-56 flex-shrink-0 flex-col border-r border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="px-5 pb-5 pt-6">
        <div className="flex items-center gap-2.5">
          {logoBroken ? (
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600 shadow-sm">
              <GraduationCap size={18} className="text-white" />
            </div>
          ) : (
            <img
              src={sidebarLogoSrc}
              alt="Portal logo"
              className="h-9 w-9 flex-shrink-0 rounded-xl border border-gray-200 bg-white object-cover shadow-sm dark:border-gray-700"
              onError={() => setLogoBroken(true)}
            />
          )}
          <div>
            <p className="text-base font-bold leading-tight text-gray-900 dark:text-white">MAA Education portal</p>
            <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500">Management Portal</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 overflow-y-auto pb-4 space-y-1">
        {filteredGroups.map((group) => (
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

      <div className="space-y-0.5 border-t border-gray-100 px-3 pb-5 pt-3 dark:border-gray-800">
        {((modules?.settings
          ? modules.settings.view === true && (roleDefaultModules ? roleDefaultModules.has("settings") : true)
          : roleDefaultModules?.has("settings") ?? true)) && (
          <>
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-500 transition-all hover:bg-gray-50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
            >
              <Settings size={16} className="text-gray-400 dark:text-gray-500" />
              Settings
            </Link>
            {isLeadershipRole(normalizedRole) && (
              <Link
                href="/dashboard/settings/permissions"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-500 transition-all hover:bg-gray-50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
              >
                <Settings size={16} className="text-gray-400 dark:text-gray-500" />
                Roles & permissions
              </Link>
            )}
          </>
        )}
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
