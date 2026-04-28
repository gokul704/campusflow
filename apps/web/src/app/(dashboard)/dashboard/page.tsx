"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/api";
import { useDarkMode } from "@/hooks/useDarkMode";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { GraduationCap, Users, BookOpen, Wallet, CalendarCheck, Building2 } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Stats {
  totalStudents: number; totalFaculty: number; totalDepartments: number;
  totalCourses: number; totalBatches: number; totalSections: number;
  feeCollectedThisMonth: number; pendingFeesCount: number; pendingFeesAmount: number;
  upcomingEventsCount: number; totalUsers: number;
}
interface WeeklyAtt { day: string; present: number; absent: number; }
interface BatchDist { name: string; value: number; }
interface UpcomingEvent { id: string; title: string; startDate: string; eventType: string; }
interface RecentAssignment {
  id: string; title: string; dueDate: string | null; createdAt: string;
  batchCourse: { course: { name: string }; batch: { name: string }; section: { name: string } };
}
interface RecentEvent { id: string; title: string; startDate: string; eventType: string; }
interface TimetableSlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room?: string | null;
  batchCourse?: {
    batch?: { name: string };
    section?: { name: string };
    course?: { name: string; code?: string };
    faculty?: { user?: { firstName?: string; lastName?: string } };
  };
}
interface Charts {
  weeklyAttendance: WeeklyAtt[];
  batchDistribution: BatchDist[];
  upcomingEvents: UpcomingEvent[];
  eventDays: number[];
  recentAssignments: RecentAssignment[];
  recentEvents: RecentEvent[];
}
type PermCell = { view: boolean; create: boolean; edit: boolean; delete: boolean };
type ModulesMap = Record<string, PermCell>;

// ─── Helpers ────────────────────────────────────────────────────────────────────
const DONUT_COLORS = ["#3B82F6", "#06B6D4", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444"];
const EV_COLOR: Record<string, { tag: string; dot: string }> = {
  EXAM:           { tag: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",      dot: "bg-red-400" },
  HOLIDAY:        { tag: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300",   dot: "bg-green-400" },
  WORKSHOP:       { tag: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300", dot: "bg-purple-400" },
  ASSIGNMENT_DUE: { tag: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300", dot: "bg-orange-400" },
  EVENT:          { tag: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",     dot: "bg-blue-400" },
};
const EV_ICON: Record<string, string> = { EXAM: "📝", HOLIDAY: "🌿", WORKSHOP: "🔬", ASSIGNMENT_DUE: "📋", EVENT: "🎉" };

function fmt(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}
function sd(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const Pulse = ({ cls }: { cls: string }) => (
  <div className={`bg-gray-100 dark:bg-gray-700 rounded animate-pulse ${cls}`} />
);

const Spinner = () => (
  <div className="w-full h-full flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

// ─── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, Icon, bg, ic, loading, href }: {
  label: string; value: string | number; sub: string;
  Icon: React.ElementType; bg: string; ic: string; loading: boolean;
  href?: string;
}) {
  const inner = (
    <>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${bg}`}>
        <Icon size={17} className={ic} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide truncate">{label}</p>
        {loading
          ? <Pulse cls="h-5 w-12 mt-1" />
          : <p className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{value}</p>}
        <p className="text-[10px] text-gray-400 truncate">{sub}</p>
      </div>
    </>
  );
  const cls =
    "bg-white dark:bg-gray-900 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm transition-shadow hover:shadow-md";
  if (href && !loading) {
    return (
      <Link href={href} className={`${cls} cursor-pointer`}>
        {inner}
      </Link>
    );
  }
  return <div className={cls}>{inner}</div>;
}

// ─── Attendance tooltip ─────────────────────────────────────────────────────────
function AttTip({
  active,
  payload,
  label,
  isDark,
}: {
  active?: boolean;
  payload?: { value: number; name: string }[];
  label?: string;
  isDark?: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className={`rounded-lg border p-2 text-xs shadow-lg ${
        isDark ? "border-gray-600 bg-gray-800 text-gray-100" : "border-gray-200 bg-white text-gray-700"
      }`}
    >
      <p className={`mb-1 font-semibold ${isDark ? "text-gray-200" : "text-gray-700"}`}>{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span className={isDark ? "text-gray-400" : "text-gray-500"}>
            {p.name === "present" ? "Present" : "Absent"}
          </span>
          <span className="font-bold">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Notice board ───────────────────────────────────────────────────────────────
function NoticeBoard({ recentEvents, recentAssignments, loading }: {
  recentEvents: RecentEvent[]; recentAssignments: RecentAssignment[]; loading: boolean;
}) {
  const [tab, setTab] = useState<"events" | "calendars">("events");

  const eventRows = recentEvents
    .filter((e) => !["EXAM", "ASSIGNMENT_DUE"].includes(e.eventType ?? "EVENT"))
    .map((e) => ({
      id: e.id,
      title: e.title,
      date: e.startDate,
      type: (e.eventType ?? "EVENT").replace(/_/g, " "),
      details: "Seminar / workshop / event",
    }));

  const calendarFromEvents = recentEvents
    .filter((e) => ["EXAM", "ASSIGNMENT_DUE"].includes(e.eventType ?? "EVENT") || /lab|schedule/i.test(e.title))
    .map((e) => ({
      id: e.id,
      title: e.title,
      date: e.startDate,
      type: (e.eventType ?? "EVENT").replace(/_/g, " "),
      details: "Academic calendar item",
    }));

  const calendarFromAssignments = recentAssignments.map((a) => ({
    id: a.id,
    title: a.title,
    date: a.dueDate ?? a.createdAt,
    type: "ASSIGNMENT",
    details: `${a.batchCourse.course.name} · ${a.batchCourse.batch.name} Sec ${a.batchCourse.section.name}`,
  }));

  const rows = (tab === "events" ? eventRows : [...calendarFromEvents, ...calendarFromAssignments])
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="flex min-h-[320px] flex-col rounded-xl bg-white shadow-sm dark:bg-gray-900">
      <div className="flex flex-shrink-0 items-center border-b border-gray-100 px-4 py-2.5 dark:border-gray-800">
        <div className="flex items-center rounded-lg border border-gray-200 p-0.5 text-[10px] dark:border-gray-700">
          <button
            type="button"
            onClick={() => setTab("events")}
            className={`rounded px-2 py-1 font-semibold transition ${
              tab === "events"
                ? "bg-blue-600 text-white"
                : "text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            }`}
          >
            Events
          </button>
          <button
            type="button"
            onClick={() => setTab("calendars")}
            className={`rounded px-2 py-1 font-semibold transition ${
              tab === "calendars"
                ? "bg-blue-600 text-white"
                : "text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            }`}
          >
            Calendars
          </button>
        </div>
      </div>

      <div className="px-4 py-2">
        <div className="grid grid-cols-12 border-b border-gray-100 pb-2 text-[10px] font-semibold uppercase text-gray-400 dark:border-gray-800">
          <span className="col-span-2">Date</span>
          <span className="col-span-5">Title</span>
          <span className="col-span-2">Type</span>
          <span className="col-span-3">Details</span>
        </div>
      </div>
      <div className="max-h-[280px] min-h-[180px] flex-1 overflow-y-auto px-4 pb-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 border-b border-gray-50 py-2 dark:border-gray-800">
              <Pulse cls="col-span-2 h-2.5" />
              <Pulse cls="col-span-5 h-2.5" />
              <Pulse cls="col-span-2 h-2.5" />
              <Pulse cls="col-span-3 h-2.5" />
            </div>
          ))
        ) : rows.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-gray-400">No items found</div>
        ) : (
          rows.map((r) => (
            <div
              key={r.id}
              className="grid grid-cols-12 gap-2 border-b border-gray-50 py-2 text-xs text-gray-600 transition-colors hover:bg-gray-50/60 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800/40"
            >
              <span className="col-span-2">{sd(r.date)}</span>
              <span className="col-span-5 truncate font-medium text-gray-800 dark:text-gray-100">{r.title}</span>
              <span className="col-span-2">{r.type}</span>
              <span className="col-span-3 truncate text-[11px] text-gray-500 dark:text-gray-400">{r.details}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function LeadershipTimetableCard({
  slots,
  loading,
  dayLabel,
}: {
  slots: TimetableSlot[];
  loading: boolean;
  dayLabel: string;
}) {
  const groupedSlots = slots.reduce<
    Array<{
      key: string;
      startTime: string;
      endTime: string;
      courseName: string;
      facultyName: string;
      room?: string | null;
      batches: string[];
    }>
  >((acc, s) => {
    const facultyName = s.batchCourse?.faculty?.user
      ? `${s.batchCourse.faculty.user.firstName ?? ""} ${s.batchCourse.faculty.user.lastName ?? ""}`.trim()
      : "Unassigned";
    const courseName = s.batchCourse?.course?.name ?? "Unnamed course";
    const room = s.room ?? null;
    const batchName = s.batchCourse?.batch?.name ?? "Batch";
    const key = [s.startTime, s.endTime, courseName, facultyName, room ?? ""].join("|");
    const found = acc.find((x) => x.key === key);
    if (found) {
      if (!found.batches.includes(batchName)) found.batches.push(batchName);
      return acc;
    }
    acc.push({
      key,
      startTime: s.startTime,
      endTime: s.endTime,
      courseName,
      facultyName,
      room,
      batches: [batchName],
    });
    return acc;
  }, []);

  return (
    <div className="flex min-h-[320px] flex-col rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-200">Leadership Timetable Tracker</h3>
        <span className="text-[10px] text-blue-600">{dayLabel}</span>
      </div>
      <p className="mb-3 text-[11px] text-gray-500 dark:text-gray-400">
        Track today&apos;s class slots, assigned faculty, and room details.
      </p>
      <div className="flex-1 space-y-2 overflow-y-auto">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-gray-100 p-2 dark:border-gray-800">
              <Pulse cls="h-2.5 w-32" />
              <Pulse cls="mt-2 h-2 w-24" />
            </div>
          ))
        ) : slots.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-gray-200 text-xs text-gray-400 dark:border-gray-800 dark:text-gray-500">
            No timetable slots for today
          </div>
        ) : (
          groupedSlots.slice(0, 6).map((s) => {
            return (
              <div key={s.key} className="rounded-lg border border-gray-100 p-2.5 dark:border-gray-800">
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">
                  {s.startTime} - {s.endTime} · {s.courseName}
                </p>
                <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                  {s.batches.join(", ")} · {s.facultyName}
                  {s.room ? ` · Room ${s.room}` : ""}
                </p>
              </div>
            );
          })
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <Link href="/dashboard/timetable" className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
          Open Timetable
        </Link>
        <Link href="/dashboard/faculty" className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
          Faculty Allocation
        </Link>
      </div>
    </div>
  );
}

// ─── Mini calendar ──────────────────────────────────────────────────────────────
function MiniCalendar({ eventDays, upcomingEvents }: { eventDays: number[]; upcomingEvents: UpcomingEvent[] }) {
  const now = new Date();
  const [y, setY] = useState(now.getFullYear());
  const [m, setM] = useState(now.getMonth());

  const firstDay  = new Date(y, m, 1).getDay();
  const totalDays = new Date(y, m + 1, 0).getDate();
  const offset    = firstDay === 0 ? 6 : firstDay - 1;
  const cells: (number | null)[] = [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  const isToday  = (d: number | null) => d !== null && d === now.getDate() && m === now.getMonth() && y === now.getFullYear();
  const hasEvent = (d: number | null) => d !== null && eventDays.includes(d);

  function prev() { m === 0 ? (setM(11), setY(y - 1)) : setM(m - 1); }
  function next() { m === 11 ? (setM(0), setY(y + 1)) : setM(m + 1); }

  return (
    <div className="flex min-h-[320px] flex-col rounded-xl bg-white shadow-sm dark:bg-gray-900">
      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-4 py-2.5 dark:border-gray-800">
        <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-200">Event Calendar</h3>
        <div className="flex items-center gap-1">
          <button onClick={prev} className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 font-bold text-sm">‹</button>
          <span className="text-[11px] text-blue-600 font-semibold w-[80px] text-center">
            {new Date(y, m).toLocaleString("default", { month: "short", year: "numeric" })}
          </span>
          <button onClick={next} className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 font-bold text-sm">›</button>
        </div>
      </div>

      <div className="flex flex-col px-3 pb-3 pt-2">
        {/* Day labels */}
        <div className="grid grid-cols-7 mb-1">
          {["M","T","W","T","F","S","S"].map((d, i) => (
            <div key={i} className="text-center text-[9px] font-bold text-gray-400">{d}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-y-0.5">
          {cells.map((d, i) => (
            <div key={i} className={`flex items-center justify-center relative h-7 rounded-lg text-[11px] font-medium transition-colors
              ${d === null ? "" : isToday(d)
                ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"}`}>
              {d}
              {hasEvent(d) && !isToday(d) && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full" />
              )}
            </div>
          ))}
        </div>

        {/* Upcoming events */}
        {upcomingEvents.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 space-y-1.5">
            {upcomingEvents.slice(0, 3).map(ev => {
              const c = EV_COLOR[ev.eventType] ?? EV_COLOR.EVENT!;
              return (
                <div key={ev.id} className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
                  <span className="text-[11px] text-gray-700 dark:text-gray-300 font-medium truncate flex-1">{ev.title}</span>
                  <span className="text-[10px] text-gray-400 flex-shrink-0">{sd(ev.startDate)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const isDark = useDarkMode();
  const [stats, setStats] = useState<Stats | null>(null);
  const [charts, setCharts] = useState<Charts | null>(null);
  const [modules, setModules] = useState<ModulesMap | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [todaySlots, setTodaySlots] = useState<TimetableSlot[]>([]);
  const [slotsL, setSlotsL] = useState(true);
  const [statsL, setStatsL] = useState(true);
  const [chartsL, setChartsL] = useState(true);
  /** Recharts needs a mounted client layout; avoids 0×0 ResponsiveContainer. */
  const [chartsReady, setChartsReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setChartsReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    authFetch("/api/auth/permissions")
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (r.ok && data?.modules && typeof data.modules === "object") setModules(data.modules as ModulesMap);
        else setModules(null);
      })
      .catch(() => setModules(null));
    authFetch("/api/auth/me")
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        setUserRole(typeof data?.user?.role === "string" ? data.user.role : "");
      })
      .catch(() => setUserRole(""));
  }, []);

  useEffect(() => {
    authFetch("/api/dashboard/stats")
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok || !data || typeof data !== "object") setStats(null);
        else setStats(data as Stats);
      })
      .finally(() => setStatsL(false));
    authFetch("/api/dashboard/charts")
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok || !data || typeof data !== "object") setCharts(null);
        else setCharts(data as Charts);
      })
      .finally(() => setChartsL(false));
    authFetch("/api/timetable")
      .then(async (r) => {
        const data = await r.json().catch(() => []);
        if (!r.ok || !Array.isArray(data)) {
          setTodaySlots([]);
          return;
        }
        const jsDay = new Date().getDay();
        const todayIdx = jsDay === 0 ? -1 : jsDay - 1;
        setTodaySlots(todayIdx < 0 ? [] : (data as TimetableSlot[]).filter((s) => s.dayOfWeek === todayIdx));
      })
      .catch(() => setTodaySlots([]))
      .finally(() => setSlotsL(false));
  }, []);

  const gridStroke = isDark ? "#374151" : "#e5e7eb";
  const axisTick = isDark ? "#9ca3af" : "#6b7280";

  const batchDist = charts?.batchDistribution ?? [];
  const totalBatch = batchDist.reduce((s, b) => s + (b?.value ?? 0), 0);
  const normalizedRole = userRole.toUpperCase();
  const roleDefaultModules = useMemo(() => {
    if (!normalizedRole) return null;
    const leadershipRoles = new Set(["ADMIN", "CMD", "PRINCIPAL"]);
    if (leadershipRoles.has(normalizedRole)) {
      return new Set([
        "dashboard",
        "students",
        "faculty",
        "users",
        "fees",
        "courses",
        "events",
        "attendance",
        "assignments",
        "reports",
        "timetable",
        "batchCourses",
        "digitalLibrary",
        "settings",
        "onboarding",
      ]);
    }
    const facultyRoles = new Set([
      "ASSISTANT_PROFESSOR",
      "PROFESSOR",
      "CLINICAL_STAFF",
      "GUEST_PROFESSOR",
    ]);
    if (facultyRoles.has(normalizedRole)) {
      return new Set([
        "dashboard",
        "batchCourses",
        "students",
        "assignments",
        "examGrades",
        "events",
        "timetable",
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

  const canView = (module: string) => {
    const permCell = modules?.[module];
    if (permCell) {
      const roleAllows = roleDefaultModules ? roleDefaultModules.has(module) : true;
      return permCell.view === true && roleAllows;
    }
    if (!modules && !roleDefaultModules) return true;
    return roleDefaultModules?.has(module) ?? false;
  };
  const canCreate = (module: string) => {
    if (!modules) return false;
    return modules[module]?.create === true;
  };

  const pendingAmt = stats?.pendingFeesAmount ?? 0;
  const isStudentDashboard = normalizedRole === "STUDENT" || normalizedRole === "GUEST_STUDENT";
  const CARDS = [
    { module: "students", label: "Total Students", value: stats?.totalStudents ?? 0,              sub: `${stats?.totalBatches ?? 0} batches · ${stats?.totalSections ?? 0} sections`, Icon: GraduationCap, bg: "bg-blue-50",    ic: "text-blue-600", href: "/dashboard/students" },
    { module: "faculty", label: "Faculty",        value: stats?.totalFaculty ?? 0,               sub: `${stats?.totalDepartments ?? 0} departments`,                                  Icon: Users,         bg: "bg-violet-50", ic: "text-violet-600", href: "/dashboard/faculty" },
    { module: "users", label: "Total Staff",    value: stats?.totalUsers ?? 0,                 sub: "Active accounts",                                                              Icon: Building2,     bg: "bg-cyan-50",   ic: "text-cyan-600", href: "/dashboard/users" },
    {
      module: "fees",
      label: isStudentDashboard ? "Fee Due" : "Fee Collected",
      value: isStudentDashboard ? fmt(pendingAmt) : fmt(stats?.feeCollectedThisMonth ?? 0),
      sub: isStudentDashboard
        ? `${stats?.pendingFeesCount ?? 0} pending payment(s)`
        : `${stats?.pendingFeesCount ?? 0} pending · ${fmt(pendingAmt)} due`,
      Icon: Wallet,
      bg: "bg-emerald-50",
      ic: "text-emerald-600",
      href: "/dashboard/fees?tab=payments&status=PENDING",
    },
    { module: "courses", label: "Courses",        value: stats?.totalCourses ?? 0,               sub: `${stats?.totalBatches ?? 0} active batches`,                                   Icon: BookOpen,      bg: "bg-amber-50",  ic: "text-amber-600", href: "/dashboard/courses" },
    { module: "events", label: "Events Ahead",   value: stats?.upcomingEventsCount ?? 0,        sub: "Upcoming",                                                                     Icon: CalendarCheck, bg: "bg-rose-50",   ic: "text-rose-600", href: "/dashboard/events" },
    { module: "assignments", label: "Assignments", value: charts?.recentAssignments?.length ?? 0, sub: "Recent items",                                                                 Icon: BookOpen,      bg: "bg-indigo-50", ic: "text-indigo-600", href: "/dashboard/assignments" },
  ].filter((c) => canView(c.module));
  const showBatchDist = canView("students");
  const showAttendance = canView("attendance");
  const showNotice = canView("events") || canView("assignments");
  const leadershipRoles = new Set(["ADMIN", "CMD", "PRINCIPAL"]);
  const showLeadershipTimetable = leadershipRoles.has(userRole) && canView("timetable");
  const dayLabel = new Date().toLocaleDateString("en-IN", { weekday: "long" });

  return (
    <div className="flex flex-col gap-4 pb-2">
      {/* ── Stat cards ── */}
      {CARDS.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {CARDS.map((c) => (
            <StatCard key={c.label} {...c} loading={statsL} />
          ))}
        </div>
      )}

      {/* Charts + widgets: explicit min-heights so rows never collapse; main scrolls */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {showLeadershipTimetable && (
          <LeadershipTimetableCard slots={todaySlots} loading={slotsL} dayLabel={dayLabel} />
        )}

        {/* Students by Batch (Donut) */}
        {showBatchDist && (
        <div className="flex min-h-[320px] flex-col rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900">
          <div className="mb-2 flex flex-shrink-0 items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-200">Students by Batch</h3>
            <span className="text-[10px] text-gray-400">Enrolment</span>
          </div>
          {chartsL || !chartsReady ? (
            <div className="flex min-h-[220px] items-center justify-center">
              <Spinner />
            </div>
          ) : totalBatch === 0 ? (
            <div className="flex min-h-[220px] flex-1 items-center justify-center text-xs text-gray-400 dark:text-gray-500">
              No data yet
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="relative h-[220px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" minHeight={220}>
                  <PieChart>
                    <Pie
                      data={batchDist}
                      cx="50%"
                      cy="50%"
                      innerRadius="42%"
                      outerRadius="72%"
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                    >
                      {batchDist.map((_, i) => (
                        <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} strokeWidth={0} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v, n) => [v, n]}
                      contentStyle={{
                        fontSize: 11,
                        borderRadius: 8,
                        border: isDark ? "1px solid #4b5563" : "1px solid #e5e7eb",
                        backgroundColor: isDark ? "#1f2937" : "#ffffff",
                        color: isDark ? "#f3f4f6" : "#111827",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-extrabold leading-none text-gray-900 dark:text-white">
                      {totalBatch}
                    </span>
                    <span className="text-[9px] text-gray-400">Students</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
                {batchDist.map((b, i) => (
                  <span key={b.name ?? i} className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
                    <span
                      className="h-2 w-2 flex-shrink-0 rounded-sm"
                      style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                    />
                    {b.name}: <strong className="text-gray-700 dark:text-gray-200">{b.value}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        )}

        {/* Weekly Attendance (Bar) */}
        {showAttendance && (
        <div className="flex min-h-[320px] flex-col rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900">
          <div className="mb-2 flex flex-shrink-0 items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-200">Attendance — This Week</h3>
            <div className="flex gap-3 text-[10px] text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-blue-500 inline-block" />Present
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-cyan-400 inline-block" />Absent
              </span>
            </div>
          </div>
          {chartsL || !chartsReady ? (
            <div className="flex min-h-[240px] flex-1 items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <div className="h-[240px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minHeight={240}>
                <BarChart
                  data={charts?.weeklyAttendance ?? []}
                  margin={{ top: 8, right: 8, left: 4, bottom: 4 }}
                  barGap={4}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: axisTick }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: axisTick }}
                    axisLine={false}
                    tickLine={false}
                    width={28}
                  />
                  <Tooltip
                    content={(props) => (
                      <AttTip
                        active={props.active}
                        payload={props.payload as unknown as { value: number; name: string }[] | undefined}
                        label={props.label as string | undefined}
                        isDark={isDark}
                      />
                    )}
                    cursor={{ fill: isDark ? "#1f2937" : "#f9fafb", radius: 4 }}
                  />
                  <Bar dataKey="present" name="present" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="absent" name="absent" fill="#22D3EE" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        )}

        {showNotice && (
          <NoticeBoard
            recentEvents={charts?.recentEvents ?? []}
            recentAssignments={charts?.recentAssignments ?? []}
            loading={chartsL}
          />
        )}

      </div>
    </div>
  );
}
