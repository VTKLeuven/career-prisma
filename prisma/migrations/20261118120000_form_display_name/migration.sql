-- AlterTable
-- The name companies see for a form. Nullable so existing forms keep showing
-- their (internal) `name` until an admin sets one; formDisplayName() in
-- lib/form-fields.ts does that fallback.
ALTER TABLE "forms" ADD COLUMN     "display_name" VARCHAR(255);
