"use client";

import Link from "next/link";

const STEPS: { n: number; label: string; href: string; note?: string }[] = [
  { n: 1, label: "Departments", href: "/dashboard/departments", note: "Template first — other imports may reference department codes." },
  { n: 2, label: "Batches", href: "/dashboard/batches", note: "Then batch years / names." },
  {
    n: 3,
    label: "Sections",
    href: "/dashboard/sections",
    note: "Add sections for each batch here (no Excel). Required before students and before batch-course rows that use section names.",
  },
  {
    n: 4,
    label: "Courses",
    href: "/dashboard/courses",
    note: "Subject + S. code style columns supported. Department code or common (Y) courses.",
  },
  {
    n: 5,
    label: "Events & calendar",
    href: "/dashboard/events",
    note: "Academic calendar rows (DD.MM.YYYY or ISO). EXAM, ASSIGNMENT_DUE, HOLIDAY, etc.",
  },
  {
    n: 6,
    label: "Faculty",
    href: "/dashboard/faculty",
    note: "After departments. Optional “Faculty” column splits names; email still required. DEFAULT_NEW_USER_PASSWORD if no Password.",
  },
  {
    n: 7,
    label: "Students",
    href: "/dashboard/students",
    note: "After batches and sections exist. Same default password rule as faculty.",
  },
  {
    n: 8,
    label: "Batch courses",
    href: "/dashboard/batch-courses",
    note: "Assigns course + semester to a batch/section; optional faculty email.",
  },
  {
    n: 9,
    label: "Timetable",
    href: "/dashboard/timetable",
    note: "After batch courses exist (or use Batch Course ID in the sheet).",
  },
  {
    n: 10,
    label: "Attendance",
    href: "/dashboard/attendance",
    note: "After students and batch courses exist.",
  },
];

/** Full numbered guide for the admin dashboard home. */
export function BulkImportGuideCard() {
  return (
    <div className="rounded-xl border border-amber-200/90 bg-amber-50/95 p-4 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/25">
      <h2 className="text-sm font-semibold text-amber-950 dark:text-amber-100">Excel bulk import — which file first, then next</h2>
      <p className="mt-1.5 text-xs leading-relaxed text-amber-950/85 dark:text-amber-100/85">
        Work <strong>top to bottom</strong>. On each screen, download that page&apos;s template, fill it, then upload. Names and codes
        must match what is already saved (for example batch and section names must match Batches and Sections exactly). Prospectus-style
        tables (S. code + Subject, DD.MM.YYYY dates, faculty names) map to the <strong>Courses</strong>, <strong>Events</strong>, and{" "}
        <strong>Faculty</strong> columns described on those pages.
      </p>
      <ol className="mt-3 list-none space-y-2.5 text-xs leading-snug text-gray-900 dark:text-gray-100">
        {STEPS.map((s) => (
          <li key={s.n} className="flex gap-2.5">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-600 text-[10px] font-bold text-white">
              {s.n}
            </span>
            <span>
              <Link
                href={s.href}
                className="font-semibold text-blue-700 underline decoration-blue-400/70 underline-offset-2 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {s.label}
              </Link>
              {s.note ? <span className="text-gray-600 dark:text-gray-400"> — {s.note}</span> : null}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Callout on the Sections page (no Excel) so admins know when to add sections. */
export function BulkImportSectionsCallout() {
  return (
    <div className="mb-4 rounded-lg border border-blue-200/90 bg-blue-50/95 px-3 py-2.5 text-xs leading-relaxed text-blue-950 dark:border-blue-900/50 dark:bg-blue-950/35 dark:text-blue-50">
      <strong className="font-semibold">When to use this page:</strong> In the numbered checklist on the{" "}
      <Link href="/dashboard" className="font-medium text-blue-800 underline hover:text-blue-950 dark:text-blue-300">
        Dashboard
      </Link>
      , add sections as <strong>step 3</strong> (after Departments and Batches). Do this before importing{" "}
      <strong>Students</strong> or <strong>Batch courses</strong> when those sheets use section names — spelling must match.
    </div>
  );
}

/** One line for import modals pointing back to the dashboard guide. */
export function BulkImportOrderHint({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs leading-relaxed text-gray-500 dark:text-gray-400 ${className}`}>
      <strong className="text-gray-700 dark:text-gray-300">Order:</strong> follow the numbered steps in{" "}
      <Link href="/dashboard/onboarding" className="font-medium text-blue-600 underline hover:text-blue-800 dark:text-blue-400">
        Onboarding
      </Link>
      {" "}so dependencies exist before each upload.
    </p>
  );
}
