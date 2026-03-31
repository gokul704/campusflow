"use client";

import { Bell, Search, Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";

interface TopHeaderProps {
  token: string;
}

function decodeJWT(token: string): { email?: string; role?: string } {
  try {
    const payload = token.split(".")[1];
    if (!payload) return {};
    return JSON.parse(atob(payload));
  } catch {
    return {};
  }
}

function getInitials(email: string): string {
  const name = email.split("@")[0] ?? "";
  const parts = name.split(/[._-]/);
  if (parts.length >= 2) return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrator",
  FACULTY: "Faculty Member",
  STUDENT: "Student",
  SUPER_ADMIN: "Super Admin",
};

export default function TopHeader({ token }: TopHeaderProps) {
  const [search, setSearch] = useState("");
  const [dark, setDark] = useState(false);
  const user = decodeJWT(token);
  const initials = user.email ? getInitials(user.email) : "AD";
  const roleLabel = ROLE_LABELS[user.role ?? ""] ?? user.role ?? "Admin";

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  // Initialise from localStorage
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

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-3.5 flex items-center gap-4 sticky top-0 z-10">
      {/* Greeting */}
      <div className="flex-shrink-0">
        <h2 className="font-bold text-gray-900 dark:text-white text-base leading-tight">
          {greeting} 👋
        </h2>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-md mx-auto">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search students, faculty, courses..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Dark / Light toggle */}
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

        {/* Notifications */}
        <button className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <Bell size={16} className="text-gray-500 dark:text-gray-400" />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-[9px] font-bold">3</span>
          </span>
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

        {/* User */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
              {user.email?.split("@")[0] ?? "Admin"}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">{roleLabel}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
