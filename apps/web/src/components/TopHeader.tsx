"use client";

import { Bell, Search, Sun, Moon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { authFetch } from "@/lib/api";

interface TopHeaderProps {
  token: string;
}

interface NotificationRow {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  link?: string | null;
  createdAt: string;
}

interface SearchHit {
  students: Array<{
    id: string;
    rollNumber: string;
    user: { firstName: string; lastName: string; email: string };
  }>;
  faculty: Array<{
    id: string;
    designation: string;
    user: { firstName: string; lastName: string; email: string };
  }>;
  courses: Array<{ id: string; name: string; code: string }>;
}

function decodeJWT(token: string): { email?: string; role?: string; firstName?: string; lastName?: string } {
  try {
    const payload = token.split(".")[1];
    if (!payload) return {};
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), "="));
    return JSON.parse(json);
  } catch {
    return {};
  }
}

/** Same cookie `authFetch` uses — layout `token` prop can lag after client-side login until a full refresh. */
function readCfTokenFromDocument(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(^| )cf_token=([^;]+)/);
  if (!match?.[2]) return null;
  try {
    return decodeURIComponent(match[2]);
  } catch {
    return match[2];
  }
}

function getInitialsFromJwt(user: ReturnType<typeof decodeJWT>, email: string): string {
  const fn = user.firstName?.trim();
  const ln = user.lastName?.trim();
  if (fn && ln) return `${fn[0] ?? ""}${ln[0] ?? ""}`.toUpperCase();
  if (fn) return fn.slice(0, 2).toUpperCase();
  const name = email.split("@")[0] ?? "";
  const parts = name.split(/[._-]/);
  if (parts.length >= 2) return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrator",
  CMD: "CMD (Managing Director)",
  PRINCIPAL: "Principal",
  ASSISTANT_PROFESSOR: "Assistant Professor",
  PROFESSOR: "Professor",
  CLINICAL_STAFF: "Clinical Staff",
  GUEST_PROFESSOR: "Guest Professor",
  OPERATIONS: "Operations",
  ACCOUNTS: "Accounts",
  IT_STAFF: "IT Staff",
  STUDENT: "Student",
  ALUMNI: "Alumni",
  GUEST_STUDENT: "Guest student",
};

export default function TopHeader({ token }: TopHeaderProps) {
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchHits, setSearchHits] = useState<SearchHit | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifList, setNotifList] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifWrapRef = useRef<HTMLDivElement>(null);

  const [dark, setDark] = useState(false);
  const [jwtClaims, setJwtClaims] = useState(() => decodeJWT(token));

  useEffect(() => {
    const fromCookie = readCfTokenFromDocument();
    const looksLikeJwt = Boolean(fromCookie && fromCookie.split(".").length === 3);
    const t = looksLikeJwt ? fromCookie! : token;
    setJwtClaims(decodeJWT(t));
  }, [token, pathname]);

  const user = jwtClaims;
  const initials = user.email ? getInitialsFromJwt(user, user.email) : "AD";
  const roleLabel = ROLE_LABELS[user.role ?? ""] ?? user.role ?? "Admin";
  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email?.split("@")[0] || "there";

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const refreshUnread = useCallback(async () => {
    const res = await authFetch("/api/notifications/unread-count");
    if (!res.ok) return;
    const d = await res.json();
    if (typeof d?.count === "number") setUnreadCount(d.count);
  }, []);

  useEffect(() => {
    void refreshUnread();
    const id = setInterval(() => void refreshUnread(), 60_000);
    return () => clearInterval(id);
  }, [refreshUnread]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (searchWrapRef.current && !searchWrapRef.current.contains(t)) setSearchOpen(false);
      if (notifWrapRef.current && !notifWrapRef.current.contains(t)) setNotifOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  useEffect(() => {
    const q = search.trim();
    if (!q) {
      setSearchHits(null);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const h = setTimeout(() => {
      void (async () => {
        const res = await authFetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = (await res.json().catch(() => null)) as SearchHit | null;
        if (res.ok && data && typeof data === "object") setSearchHits(data);
        else setSearchHits({ students: [], faculty: [], courses: [] });
        setSearchLoading(false);
      })();
    }, 280);
    return () => clearTimeout(h);
  }, [search]);

  useEffect(() => {
    const saved = localStorage.getItem("cf_theme");
    const prefersDark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(prefersDark);
    document.documentElement.classList.toggle("dark", prefersDark);
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("cf_theme", next ? "dark" : "light");
  }

  async function openNotifications() {
    const next = !notifOpen;
    setNotifOpen(next);
    if (next) {
      setNotifLoading(true);
      const res = await authFetch("/api/notifications");
      const data = await res.json().catch(() => []);
      setNotifList(Array.isArray(data) ? data : []);
      setNotifLoading(false);
      void refreshUnread();
    }
  }

  async function markRead(id: string) {
    const res = await authFetch(`/api/notifications/${id}/read`, { method: "PUT" });
    if (!res.ok) return;
    setNotifList(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)));
    void refreshUnread();
  }

  async function markAllRead() {
    const res = await authFetch("/api/notifications/mark-all-read", { method: "PUT" });
    if (!res.ok) return;
    setNotifList(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  const hasHits =
    (searchHits?.students.length ?? 0) +
      (searchHits?.faculty.length ?? 0) +
      (searchHits?.courses.length ?? 0) >
    0;

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-3.5 flex items-center gap-4 sticky top-0 z-10">
      <div className="flex-shrink-0">
        <h2 className="font-bold text-gray-900 dark:text-white text-base leading-tight">
          {greeting}, {displayName}
        </h2>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      <div className="flex-1 max-w-md mx-auto" ref={searchWrapRef}>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            placeholder="Search students, faculty, courses..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
          />
          {searchOpen && search.trim() && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-xl border border-gray-200 bg-white py-2 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-900">
              {searchLoading ? (
                <p className="px-3 py-2 text-gray-500 dark:text-gray-400">Searching…</p>
              ) : !hasHits ? (
                <p className="px-3 py-2 text-gray-500 dark:text-gray-400">No matches</p>
              ) : (
                <>
                  {searchHits?.students.map(s => (
                    <Link
                      key={s.id}
                      href={`/dashboard/students?search=${encodeURIComponent(s.rollNumber || s.user.email)}`}
                      onClick={() => {
                        setSearchOpen(false);
                        setSearch("");
                      }}
                      className="block px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <span className="font-medium text-gray-900 dark:text-white">
                        {s.user.firstName} {s.user.lastName}
                      </span>
                      <span className="ml-2 text-xs text-gray-500">Roll {s.rollNumber}</span>
                    </Link>
                  ))}
                  {searchHits?.faculty.map(f => (
                    <Link
                      key={f.id}
                      href={`/dashboard/faculty?search=${encodeURIComponent(f.user.email)}`}
                      onClick={() => {
                        setSearchOpen(false);
                        setSearch("");
                      }}
                      className="block px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <span className="font-medium text-gray-900 dark:text-white">
                        {f.user.firstName} {f.user.lastName}
                      </span>
                      <span className="ml-2 text-xs text-gray-500">{f.designation}</span>
                    </Link>
                  ))}
                  {searchHits?.courses.map(c => (
                    <Link
                      key={c.id}
                      href="/dashboard/courses"
                      onClick={() => {
                        setSearchOpen(false);
                        setSearch("");
                      }}
                      className="block px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <span className="font-medium text-gray-900 dark:text-white">{c.name}</span>
                      <span className="ml-2 text-xs text-gray-500">{c.code}</span>
                    </Link>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={toggleTheme}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark
            ? <Sun size={16} className="text-amber-400" />
            : <Moon size={16} className="text-gray-500" />
          }
        </button>

        <div className="relative" ref={notifWrapRef}>
          <button
            type="button"
            onClick={() => void openNotifications()}
            className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Notifications"
          >
            <Bell size={16} className="text-gray-500 dark:text-gray-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-[9px] font-bold">{unreadCount > 9 ? "9+" : unreadCount}</span>
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-80 max-h-96 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
              <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2 dark:border-gray-800">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => void markAllRead()}
                    className="text-[10px] font-medium text-blue-600 hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifLoading ? (
                  <p className="px-3 py-4 text-center text-xs text-gray-500">Loading…</p>
                ) : notifList.length === 0 ? (
                  <p className="px-3 py-4 text-center text-xs text-gray-500">No notifications</p>
                ) : (
                  notifList.map(n => {
                    const inner = (
                      <div
                        className={`border-b border-gray-50 px-3 py-2.5 text-left dark:border-gray-800 ${
                          !n.isRead ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                        }`}
                      >
                        <p className="text-xs font-semibold text-gray-900 dark:text-white">{n.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-gray-600 dark:text-gray-400">{n.body}</p>
                        <p className="mt-1 text-[10px] text-gray-400">
                          {new Date(n.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                      </div>
                    );
                    return (
                      <div key={n.id} className="relative">
                        {n.link ? (
                          <Link href={n.link} onClick={() => void markRead(n.id)} className="block hover:bg-gray-50 dark:hover:bg-gray-800/60">
                            {inner}
                          </Link>
                        ) : (
                          <button type="button" className="block w-full hover:bg-gray-50 dark:hover:bg-gray-800/60" onClick={() => void markRead(n.id)}>
                            {inner}
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
              {displayName}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">{roleLabel}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
