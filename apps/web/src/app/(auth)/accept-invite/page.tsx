import Link from "next/link";

/**
 * Invites were removed in favour of direct user creation from the dashboard.
 */
export default function AcceptInvitePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md rounded-xl bg-white p-8 text-center shadow">
        <h1 className="text-lg font-semibold text-gray-900">Invites are no longer used</h1>
        <p className="mt-2 text-sm text-gray-600">
          An administrator creates accounts directly from Users or Students. Ask them to add your email, then sign in with the password they set (or the institute default).
        </p>
        <Link href="/login" className="mt-6 inline-block text-sm font-medium text-blue-600 hover:underline">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
