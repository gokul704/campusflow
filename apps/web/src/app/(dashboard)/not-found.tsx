import Link from "next/link";

/**
 * Shown for missing dashboard routes (and when notFound() is called under this layout).
 * Keeps users inside the dashboard chrome instead of the bare root not-found.
 */
export default function DashboardNotFound() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
      <h1 className="text-lg font-semibold text-gray-900">Page not found</h1>
      <p className="mt-2 text-sm text-gray-500">
        This dashboard page does not exist or is unavailable.
      </p>
      <Link
        href="/dashboard"
        className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-800"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
