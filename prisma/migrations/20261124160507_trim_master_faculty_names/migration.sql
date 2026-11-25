-- One-time backfill (BR-64): master and faculty names saved with a leading or
-- trailing space reached the student CSV exports as-is and broke the staff's
-- InDesign import. From now on toMasterWrite() / toFacultyWrite() in
-- src/lib/repos/features.ts trim every write, so only rows saved before that
-- need fixing: masters.name, masters.short_name and faculties.name.
--
-- The character set is exactly what the app's String.prototype.trim() strips
-- (ECMAScript WhiteSpace + LineTerminator), so the backfill and a fresh save
-- through the app agree: tab, LF, VT, FF, CR, space, no-break space U+00A0
-- (the usual padding in names pasted from Word or a website), U+1680,
-- U+2000-U+200A, U+2028, U+2029, U+202F, U+205F, U+3000 and U+FEFF (BOM).
-- It is listed explicitly instead of using btrim() (ASCII space only) or
-- [[:space:]] / \s (locale-dependent; glibc does not count U+00A0 as space).
--
-- Only rows that actually change are touched, so a clean database is a no-op
-- and re-running it changes nothing. NULLs stay NULL. These columns are not
-- unique, so two rows ending up with the same name is fine.
DO $$
DECLARE
  ws CONSTANT text :=
    '[\u0009\u000a\u000b\u000c\u000d    -     　﻿]';
  edges CONSTANT text := '^' || ws || '+|' || ws || '+$';
BEGIN
  UPDATE "masters"
  SET "name" = regexp_replace("name", edges, '', 'g'),
      "short_name" = regexp_replace("short_name", edges, '', 'g')
  WHERE "name" <> regexp_replace("name", edges, '', 'g')
     OR "short_name" <> regexp_replace("short_name", edges, '', 'g');

  UPDATE "faculties"
  SET "name" = regexp_replace("name", edges, '', 'g')
  WHERE "name" <> regexp_replace("name", edges, '', 'g');
END
$$;
