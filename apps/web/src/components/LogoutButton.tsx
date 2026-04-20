"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  function handleLogout() {
    document.cookie = "cf_token=; path=/; max-age=0";
    document.documentElement.classList.remove("dark");
    localStorage.setItem("cf_theme", "light");
    router.push("/login");
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full text-left px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition font-medium"
    >
      Sign out
    </button>
  );
}
