import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="rounded-xl border border-gray-200 bg-white px-8 py-10 shadow-sm max-w-md">
        <h1 className="text-xl font-semibold text-gray-900">Page not found</h1>
        <p className="mt-2 text-gray-500 text-sm">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="mt-6 flex flex-col gap-2 text-sm">
          <Link href="/" className="font-medium text-blue-600 hover:text-blue-800">
            Back to home
          </Link>
          <Link href="/login" className="font-medium text-gray-600 hover:text-gray-800">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
