-- CreateTable
CREATE TABLE "career_sub_option_grants" (
    "id" SERIAL NOT NULL,
    "career_sub_option_id" INTEGER NOT NULL,
    "type" VARCHAR(64) NOT NULL,
    "config" JSONB,
    "date_created" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "career_sub_option_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "career_sub_option_grants_type_idx" ON "career_sub_option_grants"("type");

-- CreateIndex
CREATE UNIQUE INDEX "career_sub_option_grants_career_sub_option_id_type_key" ON "career_sub_option_grants"("career_sub_option_id", "type");

-- AddForeignKey
ALTER TABLE "career_sub_option_grants" ADD CONSTRAINT "career_sub_option_grants_career_sub_option_id_fkey" FOREIGN KEY ("career_sub_option_id") REFERENCES "career_sub_options"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Grants for the sub-options whose *name* used to decide access, matched the
-- way the old checks did (lib/utils/company-access.ts before this change):
-- case-insensitive and trimmed, and for matching software any name holding
-- both words. Access is the same right after this migration; from then on the
-- names are labels. The vacancy platform had no check at all (it is still
-- behind DEV_ENVIRONMENT), so nothing is backfilled for it.
INSERT INTO "career_sub_option_grants" ("career_sub_option_id", "type", "config")
SELECT "id", 'cv_book', '{"scope": "sale_year"}'::jsonb
FROM "career_sub_options" WHERE lower(btrim("name")) = 'cv book'
UNION ALL
SELECT "id", 'company_page', NULL
FROM "career_sub_options" WHERE lower(btrim("name")) = 'company page on platform'
UNION ALL
SELECT "id", 'matching_software', NULL
FROM "career_sub_options" WHERE lower("name") LIKE '%matching%' AND lower("name") LIKE '%software%'
UNION ALL
SELECT "id", 'student_schedules', NULL
FROM "career_sub_options" WHERE lower(btrim("name")) = 'student schedules'
UNION ALL
SELECT "id", 'extra_booth', NULL
FROM "career_sub_options" WHERE lower(btrim("name")) = 'extra booth'
ON CONFLICT ("career_sub_option_id", "type") DO NOTHING;
