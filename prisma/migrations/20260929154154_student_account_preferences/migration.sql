-- Student account page (/student/account): a preferred language, and a copy of
-- what the SSO last sent for study info so a student's own choice and a later
-- change at vtk.be can take turns ("most recent wins", upsertStudentFromSso()).

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "preferred_language" VARCHAR(8),
ADD COLUMN     "sso_locale" VARCHAR(16),
ADD COLUMN     "sso_study_programmes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "sso_study_years" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Until now the study columns of a non-self-reported SSO student held exactly
-- what the SSO sent, so they seed the copy. Self-reported rows keep the empty
-- default: for them the SSO sent nothing.
UPDATE "students"
SET "sso_study_programmes" = "study_programmes",
    "sso_study_years" = "study_years"
WHERE "sso_subject" IS NOT NULL AND "study_self_reported" = false;
