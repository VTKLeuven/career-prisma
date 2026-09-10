-- Event pages no longer carry their own draft/published status; the owning
-- CareerEvent's status is the single gate for the public page.
--
-- Visibility used to be decided by career_event_pages.status alone, so the
-- event status is first aligned with it. Only events that actually have a page
-- are touched -- an event without a page had no public URL either way.
UPDATE "career_events" AS e
SET "status" = CASE
  WHEN EXISTS (
    SELECT 1 FROM "career_event_pages" p
    WHERE p."event_id" = e."id" AND p."status" = 'published'
  ) THEN 'published'
  ELSE 'draft'
END
WHERE EXISTS (SELECT 1 FROM "career_event_pages" p WHERE p."event_id" = e."id");

ALTER TABLE "career_event_pages" DROP COLUMN "status";
