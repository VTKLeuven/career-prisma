-- One-time backfill (BR-64): master and faculty names saved with a leading or
-- trailing space reached the student CSV exports as-is and broke the staff's
-- InDesign import. From now on toMasterWrite() / toFacultyWrite() in
-- src/lib/repos/features.ts trim every write, so only rows saved before that
-- need fixing: masters.name, masters.short_name and faculties.name.
--
-- Only rows that actually change are touched, so a clean database is a no-op
-- and re-running it changes nothing. These columns are not unique, so two
-- rows ending up with the same name is fine. btrim() strips spaces, tabs and
-- line breaks, like the app's String.prototype.trim() does for ASCII input.
UPDATE "masters"
SET "name" = btrim("name", E' \t\r\n'),
    "short_name" = btrim("short_name", E' \t\r\n')
WHERE "name" <> btrim("name", E' \t\r\n')
   OR "short_name" <> btrim("short_name", E' \t\r\n');

UPDATE "faculties"
SET "name" = btrim("name", E' \t\r\n')
WHERE "name" <> btrim("name", E' \t\r\n');
