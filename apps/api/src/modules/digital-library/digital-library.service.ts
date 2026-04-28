import { prisma } from "@campusflow/db";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { Prisma } from "@prisma/client";

const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads", "digital-library");
const MAX_PDF_SIZE_BYTES = 50 * 1024 * 1024;
const ITEM_INCLUDE = {
  uploadedBy: { select: { firstName: true, lastName: true, email: true } },
  category: { select: { id: true, name: true } },
} as const;

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function toPdfBuffer(base64: string): Buffer {
  const cleaned = base64.includes(",") ? base64.split(",").at(-1)! : base64;
  const buf = Buffer.from(cleaned, "base64");
  if (buf.length < 4) throw new Error("Invalid PDF file data");
  const magic = buf.subarray(0, 4).toString("utf8");
  if (magic !== "%PDF") throw new Error("Only PDF files are supported");
  return buf;
}

export async function listLibraryItems(
  tenantId: string,
  filters: { q?: string; categoryId?: string; limit?: number } = {}
) {
  const where: Prisma.DigitalLibraryItemWhereInput = { tenantId };
  const q = filters.q?.trim();
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { originalFileName: { contains: q, mode: "insensitive" } },
      { category: { name: { contains: q, mode: "insensitive" } } },
    ];
  }
  if (filters.categoryId) where.categoryId = filters.categoryId;

  return prisma.digitalLibraryItem.findMany({
    where,
    include: ITEM_INCLUDE,
    orderBy: { createdAt: "desc" },
    take: filters.limit && filters.limit > 0 ? Math.min(filters.limit, 100) : undefined,
  });
}

export async function listLibraryCategories(tenantId: string) {
  return prisma.digitalLibraryCategory.findMany({
    where: { tenantId },
    orderBy: [{ name: "asc" }],
  });
}

export async function createLibraryCategory(
  tenantId: string,
  data: { name: string; description?: string }
) {
  const name = data.name.trim();
  if (!name) throw new Error("Category name is required");

  const existing = await prisma.digitalLibraryCategory.findFirst({
    where: { tenantId, name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) throw new Error("Category already exists");

  return prisma.digitalLibraryCategory.create({
    data: {
      tenantId,
      name,
      description: data.description?.trim() || null,
    },
  });
}

export async function createLibraryItem(
  tenantId: string,
  uploadedByUserId: string,
  data: {
    title: string;
    description?: string;
    originalFileName: string;
    fileBase64: string;
    categoryId: string;
  }
) {
  const pdf = toPdfBuffer(data.fileBase64);
  if (pdf.length > MAX_PDF_SIZE_BYTES) {
    throw new Error("PDF size must be 50MB or less");
  }
  const ext = path.extname(data.originalFileName || "").toLowerCase() || ".pdf";
  if (ext !== ".pdf") throw new Error("Please upload a PDF file");
  const category = await prisma.digitalLibraryCategory.findFirst({
    where: { id: data.categoryId, tenantId },
    select: { id: true },
  });
  if (!category) throw new Error("Please select a valid category");

  const tenantDir = path.join(UPLOAD_ROOT, tenantId);
  await fs.mkdir(tenantDir, { recursive: true });

  const storedFileName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${safeFileName(
    data.originalFileName || "document.pdf"
  )}`;
  const absPath = path.join(tenantDir, storedFileName);
  await fs.writeFile(absPath, pdf);

  return prisma.digitalLibraryItem.create({
    data: {
      tenantId,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      categoryId: data.categoryId,
      filePath: absPath,
      originalFileName: data.originalFileName.trim() || "document.pdf",
      uploadedByUserId,
    },
    include: ITEM_INCLUDE,
  });
}

export async function getLibraryFile(tenantId: string, id: string) {
  const item = await prisma.digitalLibraryItem.findFirst({
    where: { id, tenantId },
  });
  if (!item) throw new Error("Library document not found");
  return item;
}

export async function deleteLibraryItem(tenantId: string, id: string) {
  const item = await prisma.digitalLibraryItem.findFirst({
    where: { id, tenantId },
  });
  if (!item) throw new Error("Library document not found");
  await prisma.digitalLibraryItem.delete({ where: { id } });
  await fs.unlink(item.filePath).catch(() => undefined);
}
