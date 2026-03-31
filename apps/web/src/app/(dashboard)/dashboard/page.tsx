"use client";

import { useEffect, useState } from "react";
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
  feeCollectedThisMonth: number; pendingFeesCount: number;
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
interface Charts {
  weeklyAttendance: WeeklyAtt[];
  batchDistribution: BatchDist[];
  upcomingEvents: UpcomingEvent[];
  eventDays: number[];
  recentAssignments: RecentAssignment[];
  recentEvents: RecentEvent[];
}

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
function StatCard({ label, value, sub, Icon, bg, ic, loading }: {
  label: string; value: string | number; sub: string;
  Icon: React.ElementType; bg: string; ic: string; loading: boolean;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
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
    </div>
  );
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
  const items = [
    ...recentEvents.map(e => ({
      id: e.id, title: e.title, date: e.startDate,
      tag: (e.eventType ?? "EVENT").replace(/_/g, " "),
      tagCls: (EV_COLOR[e.eventType ?? "EVENT"] ?? EV_COLOR.EVENT!).tag,
      icon: EV_ICON[e.eventType ?? "EVENT"] ?? "📌", sub: "",
    })),
    ...recentAssignments.map(a => ({
      id: a.id, title: a.title, date: a.dueDate ?? a.createdAt,
      tag: "ASSIGNMENT", tagCls: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300", icon: "📋",
      sub: `${a.batchCourse.course.name} · ${a.batchCourse.batch.name} Sec ${a.batchCourse.section.name}`,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  return (
    <div className="flex min-h-[320px] flex-col rounded-xl bg-white shadow-sm dark:bg-gray-900">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-4 py-2.5 dark:border-gray-800">
        <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-200">Notice Board</h3>
        <a href="/dashboard/events" className="text-[11px] font-medium text-blue-600 hover:underline">View all →</a>
      </div>
      <div className="max-h-[340px] min-h-[200px] flex-1 divide-y divide-gray-50 overflow-y-auto dark:divide-gray-800">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-4 py-2.5 flex gap-3 items-center">
                <Pulse cls="w-8 h-8 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-1.5"><Pulse cls="h-2.5 w-3/4" /><Pulse cls="h-2 w-1/2" /></div>
              </div>
            ))
          : items.length === 0
            ? <div className="flex flex-col items-center justify-center gap-1 py-12 text-gray-300">
                <span className="text-3xl">📭</span>
                <span className="text-xs">No notices yet</span>
              </div>
            : items.map(n => (
                <div key={n.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-sm flex-shrink-0">
                    {n.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 dark:text-white truncate">{n.title}</p>
                    {n.sub && <p className="text-[10px] text-gray-400 truncate">{n.sub}</p>}
                    <p className="text-[10px] text-gray-400">{sd(n.date)}</p>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 ${n.tagCls}`}>
                    {n.tag}
                  </span>
                </div>
              ))
        }
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
  const [statsL, setStatsL] = useState(true);
  const [chartsL, setChartsL] = useState(true);
  /** Recharts needs a mounted client layout; avoids 0×0 ResponsiveContainer. */
  const [chartsReady, setChartsReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setChartsReady(true));
    return () => cancelAnimationFrame(id);
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
  }, []);

  const gridStroke = isDark ? "#374151" : "#e5e7eb";
  const axisTick = isDark ? "#9ca3af" : "#6b7280";

  const batchDist = charts?.batchDistribution ?? [];
  const totalBatch = batchDist.reduce((s, b) => s + (b?.value ?? 0), 0);

  const CARDS = [
    { label: "Total Students", value: stats?.totalStudents ?? 0,              sub: `${stats?.totalBatches ?? 0} batches · ${stats?.totalSections ?? 0} sections`, Icon: GraduationCap, bg: "bg-blue-50",    ic: "text-blue-600" },
    { label: "Faculty",        value: stats?.totalFaculty ?? 0,               sub: `${stats?.totalDepartments ?? 0} departments`,                                  Icon: Users,         bg: "bg-violet-50", ic: "text-violet-600" },
    { label: "Total Staff",    value: stats?.totalUsers ?? 0,                 sub: "Active accounts",                                                              Icon: Building2,     bg: "bg-cyan-50",   ic: "text-cyan-600" },
    { label: "Fee Collected",  value: fmt(stats?.feeCollectedThisMonth ?? 0), sub: `${stats?.pendingFeesCount ?? 0} pending`,                                      Icon: Wallet,        bg: "bg-emerald-50",ic: "text-emerald-600" },
    { label: "Courses",        value: stats?.totalCourses ?? 0,               sub: `${stats?.totalBatches ?? 0} active batches`,                                   Icon: BookOpen,      bg: "bg-amber-50",  ic: "text-amber-600" },
    { label: "Events Ahead",   value: stats?.upcomingEventsCount ?? 0,        sub: "Upcoming",                                                                     Icon: CalendarCheck, bg: "bg-rose-50",   ic: "text-rose-600" },
  ];

  return (
    <div className="flex flex-col gap-4 pb-2">
      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {CARDS.map((c) => (
          <StatCard key={c.label} {...c} loading={statsL} />
        ))}
      </div>

      {/* Charts + widgets: explicit min-heights so rows never collapse; main scrolls */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Students by Batch (Donut) */}
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

        {/* Weekly Attendance (Bar) */}
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

        <NoticeBoard
          recentEvents={charts?.recentEvents ?? []}
          recentAssignments={charts?.recentAssignments ?? []}
          loading={chartsL}
        />

        <MiniCalendar
          eventDays={charts?.eventDays ?? []}
          upcomingEvents={charts?.upcomingEvents ?? []}
        />

      </div>
    </div>
  );
}
