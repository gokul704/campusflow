export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white">
      <h1 className="text-4xl font-bold text-gray-900">CampusFlow</h1>
      <p className="mt-4 text-lg text-gray-500">Modern college management system</p>
      <a
        href="/login"
        className="mt-8 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        Login to Dashboard
      </a>
    </main>
  );
}
