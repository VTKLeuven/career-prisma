-- Technical log for the IT admins (/admin/system-logs). Written first by the
-- VTK SSO login flow; see SystemLog in schema.prisma for what may go in it.

-- CreateTable
CREATE TABLE "system_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" VARCHAR(64) NOT NULL,
    "level" VARCHAR(16) NOT NULL,
    "event" VARCHAR(64) NOT NULL,
    "message" TEXT NOT NULL,
    "student_id" INTEGER,
    "details" JSONB,

    CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "system_logs_created_at_idx" ON "system_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "system_logs_source_created_at_idx" ON "system_logs"("source", "created_at" DESC);
