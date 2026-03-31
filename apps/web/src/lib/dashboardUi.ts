/**
 * Shared Tailwind class snippets for dashboard pages (light + dark via `class="dark"` on <html>).
 */
export const dash = {
  pageTitle: "text-2xl font-bold text-gray-900 dark:text-white",
  sectionTitle: "text-lg font-semibold text-gray-900 dark:text-white",
  card: "rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900",
  tableWrap: "overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900",
  /** Explicit colors: <th> does not always inherit thead color reliably across browsers */
  th: "px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-300",
  thead: "border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500 dark:border-gray-800 dark:bg-gray-950/80 dark:text-gray-300",
  tbodyDivide: "divide-y divide-gray-100 dark:divide-gray-800",
  rowHover: "transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/80",
  emptyCell: "px-4 py-8 text-center text-gray-400 dark:text-gray-500",
  cellMuted: "text-gray-500 dark:text-gray-400",
  cellStrong: "font-medium text-gray-900 dark:text-white",
  cellMono: "font-mono text-gray-600 dark:text-gray-300",
  label: "mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300",
  input:
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-950 dark:text-white",
  textarea:
    "w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-950 dark:text-white",
  select:
    "rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-950 dark:text-white",
  selectFull:
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-950 dark:text-white",
  /** Select that may be disabled (e.g. dependent on another field) */
  selectFullDisabled:
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 dark:border-gray-600 dark:bg-gray-950 dark:text-white dark:disabled:bg-gray-900 dark:disabled:text-gray-500",
  btnPrimary: "rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition hover:bg-blue-700 disabled:opacity-50",
  btnSecondary:
    "rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800",
  btnDanger:
    "text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300",
  btnLink:
    "text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300",
  modalOverlay: "fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60",
  modalPanel:
    "w-full rounded-xl bg-white p-6 shadow-xl dark:border dark:border-gray-800 dark:bg-gray-900",
  errorBanner: "mb-3 rounded bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300",
  badge:
    "rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  /** Placeholder em dash in tables */
  emDash: "text-gray-300 dark:text-gray-600",
  statusPillActive:
    "rounded-full px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300",
  statusPillInactive:
    "rounded-full px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  inputSearch:
    "w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-950 dark:text-white sm:w-64",
  link: "text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300",
  paginationBar:
    "flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400",
  paginationBtn:
    "rounded border border-gray-200 px-3 py-1 disabled:opacity-40 dark:border-gray-600 dark:text-gray-200",
  rowDivider: "border-b border-gray-100 pb-2 dark:border-gray-800",
  dt: "text-gray-500 dark:text-gray-400",
  dd: "text-right text-gray-900 dark:text-white",
  scheduleCard:
    "rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-900/80",
  modalScroll: "max-h-[90vh] overflow-y-auto",
  /** Segmented control — inactive */
  tabInactive:
    "rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800",
  tabActive: "rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white",
  labelSmall: "mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400",
  cardToolbar: "flex flex-wrap items-end gap-3 p-4",
  tableHeaderBar: "flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800",
  tableFooterBar: "flex items-center gap-3 border-t border-gray-100 px-4 py-3 dark:border-gray-800",
  chipBtn:
    "rounded border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800",
  selectMin: "min-w-[220px]",
} as const;
