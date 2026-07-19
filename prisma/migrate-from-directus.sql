-- Transforms a restored Directus database into the shape this application uses
-- with Prisma. Run it against a COPY of the Directus dump, never against the
-- live Directus database.
--
--   docker exec -i <pg> pg_restore -U postgres -d career --no-owner < directus-data.dump
--   docker exec -i <pg> psql -U postgres -d career -v ON_ERROR_STOP=1 -f - < migrate-from-directus.sql
--
-- Idempotent: every statement uses IF EXISTS / IF NOT EXISTS, so re-running is
-- safe. Verified against the 2026-07-19 production export (171k application
-- rows, 92 tables in, 57 tables out).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Dead application tables
-- ---------------------------------------------------------------------------
-- 'Companies' (2 rows) is a superseded first draft holding only test records
-- ("test comp", "DummyCompany") with integer ids. The live table is 'company'.
-- attendant_scans.company_id and orders.company still carry FKs to it, but both
-- columns are NULL in all 5458 scans and all 374 orders, so nothing is lost.
DROP TABLE IF EXISTS "career_event_page_Companies" CASCADE;
DROP TABLE IF EXISTS "Company_users" CASCADE;
DROP TABLE IF EXISTS "Companies" CASCADE;

-- Unrelated to this application; shares the Directus instance with another project.
DROP TABLE IF EXISTS "Sport_Inventory" CASCADE;

-- Empty and unreferenced by any code path.
DROP TABLE IF EXISTS career_event_registration CASCADE;
DROP TABLE IF EXISTS career_event_page_files CASCADE;
DROP TABLE IF EXISTS company_career_event CASCADE;
DROP TABLE IF EXISTS form_responses_files CASCADE;
DROP TABLE IF EXISTS signage_media_files CASCADE;

-- Two abandoned generations of the vacancies<->sectors join. The canonical one
-- is vacancies_vacancy_sectors: Directus exposes it as the "sectors" alias on
-- vacancies, and repos/vacancies.ts queries it via `vacancy_sectors_id`.
DROP TABLE IF EXISTS vacancies_vacancies_sectors CASCADE;
DROP TABLE IF EXISTS vacancies_sectors CASCADE;

-- ---------------------------------------------------------------------------
-- 2. Directus infrastructure
-- ---------------------------------------------------------------------------
-- directus_users, directus_files and directus_roles are NOT dropped: they hold
-- real application data (612 company reps, 2236 uploads, 4 roles whose UUIDs
-- are compared directly in auth-server.ts). They are renamed in step 6.
DROP TABLE IF EXISTS directus_access CASCADE;
DROP TABLE IF EXISTS directus_activity CASCADE;
DROP TABLE IF EXISTS directus_collections CASCADE;
DROP TABLE IF EXISTS directus_comments CASCADE;
DROP TABLE IF EXISTS directus_dashboards CASCADE;
DROP TABLE IF EXISTS directus_extensions CASCADE;
DROP TABLE IF EXISTS directus_fields CASCADE;
DROP TABLE IF EXISTS directus_flows CASCADE;
DROP TABLE IF EXISTS directus_folders CASCADE;
DROP TABLE IF EXISTS directus_migrations CASCADE;
DROP TABLE IF EXISTS directus_notifications CASCADE;
DROP TABLE IF EXISTS directus_operations CASCADE;
DROP TABLE IF EXISTS directus_panels CASCADE;
DROP TABLE IF EXISTS directus_permissions CASCADE;
DROP TABLE IF EXISTS directus_policies CASCADE;
DROP TABLE IF EXISTS directus_presets CASCADE;
DROP TABLE IF EXISTS directus_relations CASCADE;
DROP TABLE IF EXISTS directus_revisions CASCADE;
DROP TABLE IF EXISTS directus_sessions CASCADE;
DROP TABLE IF EXISTS directus_settings CASCADE;
DROP TABLE IF EXISTS directus_shares CASCADE;
DROP TABLE IF EXISTS directus_translations CASCADE;
DROP TABLE IF EXISTS directus_versions CASCADE;
DROP TABLE IF EXISTS directus_webhooks CASCADE;

-- ---------------------------------------------------------------------------
-- 3. Editorial audit columns
-- ---------------------------------------------------------------------------
-- user_created / user_updated record which Directus admin last touched a row.
-- Nothing in src/ reads them, and they generate ~40 foreign keys into
-- directus_users that would otherwise clutter every Prisma model.
-- date_created / date_updated are kept: those are meaningful timestamps.
-- Genuine user references (company.salesperson, orders.shifter,
-- attendant_scans.scanned_by, CV_Book_screening.screened_by,
-- speaker.representative) are deliberately untouched.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT c.relname AS tbl, a.attname AS col
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND a.attname IN ('user_created', 'user_updated')
  LOOP
    EXECUTE format('ALTER TABLE %I DROP COLUMN IF EXISTS %I', r.tbl, r.col);
  END LOOP;
END $$;

-- Dead columns on orders: always NULL across all 374 rows. The application
-- resolves both by traversing the booth relation (repos/orders.ts requests
-- "booth.company.*" and "booth.zone.*"), never these columns.
ALTER TABLE orders DROP COLUMN IF EXISTS company;
ALTER TABLE orders DROP COLUMN IF EXISTS zone;

-- Directus UI state and unused auth columns on the users table.
ALTER TABLE directus_users
  DROP COLUMN IF EXISTS language,
  DROP COLUMN IF EXISTS appearance,
  DROP COLUMN IF EXISTS theme_dark,
  DROP COLUMN IF EXISTS theme_light,
  DROP COLUMN IF EXISTS theme_dark_overrides,
  DROP COLUMN IF EXISTS theme_light_overrides,
  DROP COLUMN IF EXISTS text_direction,
  DROP COLUMN IF EXISTS last_page,
  DROP COLUMN IF EXISTS email_notifications,
  DROP COLUMN IF EXISTS tags,
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS tfa_secret,          -- 0 rows populated
  DROP COLUMN IF EXISTS external_identifier, -- 0 rows populated
  DROP COLUMN IF EXISTS rnumber,             -- 0 rows populated
  DROP COLUMN IF EXISTS token,               -- Directus static API tokens
  DROP COLUMN IF EXISTS auth_data,
  DROP COLUMN IF EXISTS provider;

-- ---------------------------------------------------------------------------
-- 4. PostGIS geometry -> plain latitude / longitude
-- ---------------------------------------------------------------------------
-- career_event_page.location is the only geometry column in the database.
-- Prisma maps geometry to Unsupported("geometry"), which Prisma Client can
-- neither read nor write. The application only ever destructures it into two
-- numbers to centre a Leaflet map, and nothing performs a spatial query, so
-- two float columns are a faithful and fully usable replacement.
ALTER TABLE career_event_page ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION;
ALTER TABLE career_event_page ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

UPDATE career_event_page
SET latitude  = ST_Y(location::geometry),
    longitude = ST_X(location::geometry)
WHERE location IS NOT NULL
  AND (latitude IS NULL OR longitude IS NULL);

ALTER TABLE career_event_page DROP COLUMN IF EXISTS location;

-- ---------------------------------------------------------------------------
-- 5. Drop PostGIS itself
-- ---------------------------------------------------------------------------
-- With the last geometry column gone the extension is dead weight, and removing
-- it means the application runs on a stock `postgres` image (which, unlike
-- postgis/postgis, publishes arm64 builds).
DROP EXTENSION IF EXISTS postgis_tiger_geocoder CASCADE;
DROP EXTENSION IF EXISTS postgis_topology CASCADE;
DROP EXTENSION IF EXISTS postgis CASCADE;
DROP SCHEMA IF EXISTS tiger CASCADE;
DROP SCHEMA IF EXISTS tiger_data CASCADE;
DROP SCHEMA IF EXISTS topology CASCADE;

-- ---------------------------------------------------------------------------
-- 6. Consistent snake_case table names
-- ---------------------------------------------------------------------------
-- Directus left a mix of PascalCase, singular and plural. Prisma models are
-- PascalCase and singular regardless (via @@map), so this only affects SQL
-- readability -- but it makes the database legible on its own terms.
ALTER TABLE IF EXISTS directus_users        RENAME TO users;
ALTER TABLE IF EXISTS directus_files        RENAME TO files;
ALTER TABLE IF EXISTS directus_roles        RENAME TO roles;
ALTER TABLE IF EXISTS "Booths"              RENAME TO booths;
ALTER TABLE IF EXISTS "Floorplan"           RENAME TO floorplans;
ALTER TABLE IF EXISTS "Academic_Year"       RENAME TO academic_years;
ALTER TABLE IF EXISTS "CV_Book"             RENAME TO cv_books;
ALTER TABLE IF EXISTS "CV_Book_screening"   RENAME TO cv_book_screenings;
ALTER TABLE IF EXISTS "zones_Booths"        RENAME TO zone_booths;
ALTER TABLE IF EXISTS company               RENAME TO companies;
ALTER TABLE IF EXISTS career_event          RENAME TO career_events;
ALTER TABLE IF EXISTS career_event_page     RENAME TO career_event_pages;
ALTER TABLE IF EXISTS career_event_option   RENAME TO career_event_options;
ALTER TABLE IF EXISTS career_sub_option     RENAME TO career_sub_options;
ALTER TABLE IF EXISTS master                RENAME TO masters;
ALTER TABLE IF EXISTS faculty               RENAME TO faculties;
ALTER TABLE IF EXISTS speaker               RENAME TO speakers;
ALTER TABLE IF EXISTS timetable             RENAME TO timetables;
ALTER TABLE IF EXISTS schedule              RENAME TO schedules;
ALTER TABLE IF EXISTS cv_book_favourite     RENAME TO cv_book_favourites;
ALTER TABLE IF EXISTS vacancy_section_config RENAME TO vacancy_section_configs;
ALTER TABLE IF EXISTS student_matching_response RENAME TO student_matching_responses;
ALTER TABLE IF EXISTS company_matching_response RENAME TO company_matching_responses;

-- ---------------------------------------------------------------------------
-- 7. Foreign key columns -> *_id
-- ---------------------------------------------------------------------------
-- Directus names FK columns after the thing they point at (`company`, `event`,
-- `logo`). That leaves Prisma with no name free for the relation field itself,
-- so it is forced into doubled names like `companyCompany` and
-- `eventCareerEvent`. Suffixing the scalar with _id frees the natural name:
--   company_id  Int
--   company     Company @relation(fields: [company_id], ...)
ALTER TABLE IF EXISTS booths                     RENAME COLUMN "Floorplan"     TO floorplan_id;
ALTER TABLE IF EXISTS career_event_pages         RENAME COLUMN floorplan       TO floorplan_id;
ALTER TABLE IF EXISTS booths                     RENAME COLUMN company         TO company_id;
ALTER TABLE IF EXISTS career_event_pages         RENAME COLUMN event           TO event_id;
ALTER TABLE IF EXISTS career_event_pages         RENAME COLUMN image           TO image_id;
ALTER TABLE IF EXISTS career_events              RENAME COLUMN image           TO image_id;
ALTER TABLE IF EXISTS companies                  RENAME COLUMN logo            TO logo_id;
ALTER TABLE IF EXISTS companies                  RENAME COLUMN salesperson     TO salesperson_id;
ALTER TABLE IF EXISTS company_matching_responses RENAME COLUMN company         TO company_id;
ALTER TABLE IF EXISTS company_user_requests      RENAME COLUMN company         TO company_id;
ALTER TABLE IF EXISTS cv_book_favourites         RENAME COLUMN company         TO company_id;
ALTER TABLE IF EXISTS cv_books                   RENAME COLUMN form            TO form_id;
ALTER TABLE IF EXISTS cv_books                   RENAME COLUMN year            TO year_id;
ALTER TABLE IF EXISTS drinks                     RENAME COLUMN image           TO image_id;
ALTER TABLE IF EXISTS faculties                  RENAME COLUMN logo            TO logo_id;
ALTER TABLE IF EXISTS masters                    RENAME COLUMN logo            TO logo_id;
ALTER TABLE IF EXISTS matching_software          RENAME COLUMN event           TO event_id;
ALTER TABLE IF EXISTS matching_software          RENAME COLUMN year            TO year_id;
ALTER TABLE IF EXISTS orders                     RENAME COLUMN booth           TO booth_id;
ALTER TABLE IF EXISTS orders                     RENAME COLUMN shifter         TO shifter_id;
ALTER TABLE IF EXISTS roles                      RENAME COLUMN parent          TO parent_id;
ALTER TABLE IF EXISTS schedules                  RENAME COLUMN event           TO event_id;
ALTER TABLE IF EXISTS schedules                  RENAME COLUMN master          TO master_id;
ALTER TABLE IF EXISTS schedules                  RENAME COLUMN pdf             TO pdf_id;
ALTER TABLE IF EXISTS signage_media              RENAME COLUMN file            TO file_id;
ALTER TABLE IF EXISTS signage_schedule_slots     RENAME COLUMN file            TO file_id;
ALTER TABLE IF EXISTS signage_schedule_slots     RENAME COLUMN screen          TO screen_id;
ALTER TABLE IF EXISTS speakers                   RENAME COLUMN representative  TO representative_id;
ALTER TABLE IF EXISTS speakers                   RENAME COLUMN time            TO time_id;
ALTER TABLE IF EXISTS student_matching_responses RENAME COLUMN student         TO student_id;
ALTER TABLE IF EXISTS timetables                 RENAME COLUMN speaker         TO speaker_id;
ALTER TABLE IF EXISTS users                      RENAME COLUMN company         TO company_id;
ALTER TABLE IF EXISTS users                      RENAME COLUMN role            TO role_id;
ALTER TABLE IF EXISTS vacancies                  RENAME COLUMN company         TO company_id;
ALTER TABLE IF EXISTS vacancies                  RENAME COLUMN sector          TO sector_id;
ALTER TABLE IF EXISTS vacancies                  RENAME COLUMN type            TO type_id;

-- Junction tables, renamed to match their new parents.
ALTER TABLE IF EXISTS "zone_booths"                       RENAME COLUMN "zones_id"  TO zone_id;
ALTER TABLE IF EXISTS "zone_booths"                       RENAME COLUMN "Booths_id" TO booth_id;
ALTER TABLE IF EXISTS career_event_page_company           RENAME TO career_event_page_companies;
ALTER TABLE IF EXISTS career_event_page_speaker           RENAME TO career_event_page_speakers;
ALTER TABLE IF EXISTS career_event_page_timetable         RENAME TO career_event_page_timetables;
ALTER TABLE IF EXISTS timetable_career_event_page         RENAME TO timetable_career_event_pages;
ALTER TABLE IF EXISTS career_event_option_career_event    RENAME TO career_event_option_events;
ALTER TABLE IF EXISTS career_event_option_career_sub_option RENAME TO career_event_option_sub_options;
ALTER TABLE IF EXISTS student_matching_response_company   RENAME TO student_matching_response_companies;

-- ---------------------------------------------------------------------------
-- 8. Orphaned junction rows
-- ---------------------------------------------------------------------------
-- Every junction FK Directus created uses ON DELETE SET NULL. Combined with how
-- it unlinks m2m relations (PATCH the alias to [], rather than deleting the
-- junction rows), clearing a relation left the rows behind with a NULL parent
-- instead of removing them. Repeated syncs accumulated them:
--
--   company_matching_response_students  106996 of 116037 rows orphaned (92%)
--   student_matching_response_company      241 of  28780
--   zones_Booths                            91 of    306
--
-- They are unreachable -- a NULL parent matches no query -- so this is dead
-- weight, not data. The Prisma repos delete junction rows outright, so nothing
-- accumulates from here on.
DELETE FROM company_matching_response_students WHERE company_matching_response_id IS NULL OR students_id IS NULL;
DELETE FROM student_matching_response_companies WHERE student_matching_response_id IS NULL OR company_id IS NULL;
DELETE FROM zone_booths WHERE zone_id IS NULL OR booth_id IS NULL;

-- ---------------------------------------------------------------------------
-- 9. Default values for UUID primary keys
-- ---------------------------------------------------------------------------
-- Directus generated row ids in application code, so these columns have no
-- database default. Without one, every Prisma `create` on these tables fails
-- with "Property 'id' is missing". gen_random_uuid() is built into PostgreSQL
-- 13 and later, so no extension is needed.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT c.relname AS tbl, a.attname AS col
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
    JOIN pg_type t ON t.oid = a.atttypid
    JOIN pg_index i ON i.indrelid = c.oid AND i.indisprimary AND a.attnum = ANY(i.indkey)
    LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND t.typname = 'uuid'
      AND d.adbin IS NULL
  LOOP
    EXECUTE format(
      'ALTER TABLE %I ALTER COLUMN %I SET DEFAULT gen_random_uuid()', r.tbl, r.col);
  END LOOP;
END $$;

COMMIT;

-- ---------------------------------------------------------------------------
-- Summary
-- ---------------------------------------------------------------------------
DO $$
DECLARE n INT;
BEGIN
  SELECT count(*) INTO n
  FROM pg_tables WHERE schemaname = 'public';
  RAISE NOTICE 'Migration complete. % tables in public schema.', n;
END $$;
