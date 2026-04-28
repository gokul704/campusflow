"use client";

import { useEffect, useState } from "react";
import { authFetch, formatApiError } from "@/lib/api";
import { dash } from "@/lib/dashboardUi";

interface Category {
  id: string;
  name: string;
  description?: string | null;
}
interface LibraryItem {
  id: string;
  title: string;
  description?: string | null;
  originalFileName: string;
  createdAt: string;
  category?: { id: string; name: string } | null;
  uploadedBy?: { firstName: string; lastName: string; email: string } | null;
}

const MAX_PDF_SIZE_BYTES = 50 * 1024 * 1024;

function getCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? match[2] : "";
}

function buildLibraryFileUrl(itemId: string, page: number): string {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? "").trim().replace(/\/$/, "");
  const token = encodeURIComponent(getCookie("cf_token"));
  const path = `/api/digital-library/${itemId}/file?token=${token}`;
  return `${base}${path}#page=${page}&view=Fit&zoom=page-fit&toolbar=0&navpanes=0&scrollbar=0`;
}

function PdfCover({ item, className = "" }: { item: LibraryItem; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 ${className}`}>
      <iframe
        src={buildLibraryFileUrl(item.id, 1)}
        title={`${item.title} cover`}
        className="h-full w-full pointer-events-none select-none"
        scrolling="no"
      />
    </div>
  );
}

export default function DigitalLibraryPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showUpload, setShowUpload] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", categoryId: "", file: null as File | null });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "" });
  const [categoryError, setCategoryError] = useState("");
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [readerItem, setReaderItem] = useState<LibraryItem | null>(null);
  const [readerPage, setReaderPage] = useState(1);
  const [turning, setTurning] = useState<"forward" | "backward" | null>(null);

  async function fetchItems() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (query.trim()) qs.set("q", query.trim());
      if (selectedCategoryId) qs.set("categoryId", selectedCategoryId);
      const suffix = qs.toString() ? `?${qs}` : "";
      const [listRes, catRes, permsRes] = await Promise.all([
        authFetch(`/api/digital-library${suffix}`),
        authFetch("/api/digital-library/categories"),
        authFetch("/api/auth/permissions"),
      ]);
      const listData = await listRes.json().catch(() => []);
      const catData = await catRes.json().catch(() => []);
      const permData = await permsRes.json().catch(() => ({}));
      setItems(Array.isArray(listData) ? listData : []);
      setCategories(Array.isArray(catData) ? catData : []);
      setCanManage(Boolean(permData?.modules?.digitalLibrary?.create));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchItems();
  }, [query, selectedCategoryId]);

  async function toBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.readAsDataURL(file);
    });
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.file) return setFormError("Please choose a PDF file.");
    if (form.file.type !== "application/pdf") return setFormError("Only PDF files are allowed.");
    if (!form.categoryId) return setFormError("Please select a category.");
    if (form.file.size > MAX_PDF_SIZE_BYTES) return setFormError("PDF size must be 50MB or less.");

    setFormLoading(true);
    try {
      const fileBase64 = await toBase64(form.file);
      const res = await authFetch("/api/digital-library", {
        method: "POST",
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          categoryId: form.categoryId,
          originalFileName: form.file.name,
          fileBase64,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setFormError(formatApiError(data));
      setShowUpload(false);
      setForm({ title: "", description: "", categoryId: "", file: null });
      void fetchItems();
    } catch {
      setFormError("Upload failed.");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    setCategoryError("");
    if (!categoryForm.name.trim()) return setCategoryError("Category name is required.");
    setCategoryLoading(true);
    try {
      const res = await authFetch("/api/digital-library/categories", {
        method: "POST",
        body: JSON.stringify({
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setCategoryError(formatApiError(data));
      setShowCategoryModal(false);
      setCategoryForm({ name: "", description: "" });
      void fetchItems();
    } catch {
      setCategoryError("Could not create category.");
    } finally {
      setCategoryLoading(false);
    }
  }

  async function handleDelete(item: LibraryItem) {
    if (!confirm(`Delete "${item.title}"?`)) return;
    const res = await authFetch(`/api/digital-library/${item.id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(formatApiError(d));
      return;
    }
    void fetchItems();
  }

  function openReader(item: LibraryItem) {
    setReaderItem(item);
    setReaderPage(1);
    setTurning(null);
  }

  function turnPage(direction: "forward" | "backward") {
    setTurning(direction);
    setTimeout(() => setTurning(null), 350);
    setReaderPage((p) => Math.max(1, p + (direction === "forward" ? 1 : -1)));
  }

  const pageSize = 9;
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const pageStart = (currentPage - 1) * pageSize;
  const paginatedItems = items.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, selectedCategoryId]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!readerItem) return;

    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const preventScroll = (e: Event) => {
      e.preventDefault();
    };

    document.addEventListener("wheel", preventScroll, { passive: false });
    document.addEventListener("touchmove", preventScroll, { passive: false });

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.removeEventListener("wheel", preventScroll);
      document.removeEventListener("touchmove", preventScroll);
    };
  }, [readerItem]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className={dash.pageTitle}>Digital Library</h1>
        {canManage && (
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowCategoryModal(true)} className={dash.btnSecondary}>+ Add Category</button>
            <button type="button" onClick={() => setShowUpload(true)} className={dash.btnPrimary}>+ Upload Book</button>
          </div>
        )}
      </div>

      <div className="mb-4 rounded-xl border border-indigo-100 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-2 md:flex-row">
          <div className="flex-1">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search books... (filter by title/description/file)"
              className={dash.input}
            />
          </div>
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="w-full md:w-56 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          >
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button type="button" onClick={() => { setQuery(""); setSelectedCategoryId(""); }} className={dash.btnSecondary}>Clear</button>
        </div>
      </div>

      <div className="rounded-xl border border-indigo-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {loading ? (
          <div className={dash.emptyCell}>Loading...</div>
        ) : items.length === 0 ? (
          <div className={dash.emptyCell}>No books found for this filter/search.</div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-950"
                >
                  <PdfCover item={item} className="mb-3 h-44" />
                  <p className="line-clamp-1 text-base font-semibold text-gray-900 dark:text-white">{item.title}</p>
                  <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-300">{item.category?.name || "Uncategorized"}</p>
                  <p className="mt-2 line-clamp-3 text-sm text-gray-600 dark:text-gray-300">{item.description?.trim() || "No description"}</p>
                  <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                    By {item.uploadedBy ? `${item.uploadedBy.firstName} ${item.uploadedBy.lastName}` : "Unknown"} on{" "}
                    {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <button type="button" onClick={() => openReader(item)} className={dash.link}>Read book</button>
                    {canManage && <button type="button" onClick={() => void handleDelete(item)} className={dash.btnDanger}>Delete</button>}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Showing {pageStart + 1}-{Math.min(pageStart + pageSize, items.length)} of {items.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className={dash.btnSecondary}
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Page {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className={dash.btnSecondary}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {showUpload && (
        <div className={dash.modalOverlay}>
          <div className={`${dash.modalPanel} w-full max-w-lg`}>
            <h2 className={`${dash.sectionTitle} mb-4`}>Upload Book</h2>
            {formError && <div className={dash.errorBanner}>{formError}</div>}
            <form onSubmit={handleUpload} className="space-y-3">
              <div><label className={dash.label}>Title</label><input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required className={dash.input} /></div>
              <div><label className={dash.label}>Description (optional)</label><textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={`${dash.input} min-h-[90px] resize-y`} /></div>
              <div>
                <label className={dash.label}>Category</label>
                <select value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))} required className={dash.input}>
                  <option value="">Select category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className={dash.label}>PDF file</label>
                <input type="file" accept="application/pdf,.pdf" onChange={(e) => setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }))} required className={dash.input} />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Maximum file size: 50MB</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowUpload(false)} className={`flex-1 ${dash.btnSecondary}`}>Cancel</button>
                <button type="submit" disabled={formLoading} className={`flex-1 ${dash.btnPrimary}`}>{formLoading ? "Uploading..." : "Upload"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className={dash.modalOverlay}>
          <div className={`${dash.modalPanel} w-full max-w-lg`}>
            <h2 className={`${dash.sectionTitle} mb-4`}>Create Category</h2>
            {categoryError && <div className={dash.errorBanner}>{categoryError}</div>}
            <form onSubmit={handleCreateCategory} className="space-y-3">
              <div><label className={dash.label}>Name</label><input value={categoryForm.name} onChange={(e) => setCategoryForm((f) => ({ ...f, name: e.target.value }))} required className={dash.input} /></div>
              <div><label className={dash.label}>Description (optional)</label><textarea value={categoryForm.description} onChange={(e) => setCategoryForm((f) => ({ ...f, description: e.target.value }))} className={`${dash.input} min-h-[90px] resize-y`} /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCategoryModal(false)} className={`flex-1 ${dash.btnSecondary}`}>Cancel</button>
                <button type="submit" disabled={categoryLoading} className={`flex-1 ${dash.btnPrimary}`}>{categoryLoading ? "Creating..." : "Create"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {readerItem && (
        <div className={dash.modalOverlay}>
          <div
            className={`${dash.modalPanel} flex h-[94vh] w-[98vw] max-w-[1400px] flex-col p-3 sm:p-4`}
            onWheelCapture={(e) => e.preventDefault()}
            onTouchMoveCapture={(e) => e.preventDefault()}
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <h2 className={dash.sectionTitle}>{readerItem.title}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {readerItem.category?.name || "Uncategorized"} - page {readerPage}
                </p>
              </div>
              <button type="button" onClick={() => setReaderItem(null)} className={dash.btnSecondary}>Close</button>
            </div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => turnPage("backward")} disabled={readerPage <= 1} className={dash.btnSecondary}>Previous page</button>
              <button type="button" onClick={() => turnPage("forward")} className={dash.btnPrimary}>Turn page</button>
            </div>
            <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-amber-200 bg-amber-50 p-1.5 sm:p-2 shadow-inner dark:border-gray-700 dark:bg-gray-900">
              <div
                className={`pointer-events-none absolute inset-y-2 right-2 z-10 w-1/2 rounded-r-lg bg-gradient-to-l from-amber-200/40 to-transparent opacity-0 transition-opacity duration-500 ${
                  turning === "forward" ? "opacity-100" : ""
                }`}
              />
              <div
                className={`pointer-events-none absolute inset-y-2 left-2 z-10 w-1/2 rounded-l-lg bg-gradient-to-r from-amber-200/30 to-transparent opacity-0 transition-opacity duration-500 ${
                  turning === "backward" ? "opacity-100" : ""
                }`}
              />
              <div
                className="h-full w-full origin-left rounded-lg bg-white shadow-lg transition-transform duration-300 dark:bg-gray-950"
                style={{
                  transform:
                    turning === "forward"
                      ? "perspective(1200px) rotateY(-14deg) translateX(10px) scale(0.995)"
                      : turning === "backward"
                        ? "perspective(1200px) rotateY(14deg) translateX(-10px) scale(0.995)"
                        : "perspective(1200px) rotateY(0deg) translateX(0px)",
                  transition: "transform 420ms cubic-bezier(0.22, 0.61, 0.36, 1)",
                }}
              >
                <iframe
                  key={`${readerItem.id}-${readerPage}`}
                  src={buildLibraryFileUrl(readerItem.id, readerPage)}
                  title={readerItem.title}
                  className="h-full w-full overflow-hidden rounded-lg pointer-events-none select-none"
                  scrolling="no"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
