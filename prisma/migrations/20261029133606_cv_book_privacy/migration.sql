-- AlterTable
ALTER TABLE "files" ADD COLUMN     "private" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "cv_book_opt_out" BOOLEAN NOT NULL DEFAULT false;

-- Every CV already in a CV book becomes private. The CV field holds the file
-- UUID as a string (or, defensively, an array of them); the backup field is
-- read the same way. markCVFilesPrivate() in lib/repos/cv-book.ts repeats this
-- for new submissions and for books created or remapped later.
UPDATE "files" f
SET "private" = true
FROM "cv_books" b
JOIN "form_versions" v ON v."form_id" = b."form_id"
JOIN "form_responses" r ON r."form_version_id" = v."id"
CROSS JOIN LATERAL (
  SELECT r."data" -> b."student_cv_field" AS val
  UNION ALL
  SELECT r."data" -> b."student_cv_field_backup"
) cv
WHERE f."private" = false
  AND (
    (jsonb_typeof(cv.val) = 'string' AND cv.val #>> '{}' = f."id"::text)
    OR (jsonb_typeof(cv.val) = 'array' AND cv.val ? f."id"::text)
  );
