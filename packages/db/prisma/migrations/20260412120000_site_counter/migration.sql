-- CreateTable
CREATE TABLE "site_counters" (
    "id" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "site_counters_pkey" PRIMARY KEY ("id")
);
