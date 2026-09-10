-- The LITUS OAuth flow was replaced by the VTK SSO (OIDC). The two token
-- columns hold the same kind of value as before, so they are RENAMED rather
-- than dropped and re-added: `prisma migrate dev` would have generated the
-- destructive pair, which would have thrown away every stored token and, more
-- importantly, set the pattern that renaming a column here loses data.
ALTER TABLE "students" RENAME COLUMN "litus_access_token" TO "sso_access_token";
ALTER TABLE "students" RENAME COLUMN "litus_token_expires_at" TO "sso_token_expires_at";

-- Identity at the SSO. Nullable because password-registered ("external")
-- students never get one; unique so two rows can never claim the same subject.
ALTER TABLE "students" ADD COLUMN "sso_subject" VARCHAR(255);
CREATE UNIQUE INDEX "students_sso_subject_unique" ON "students"("sso_subject");

-- Claims mirrored from the SSO on each login flow. Programmes and years are
-- text[] because the SSO sends arrays of lowercased enum values -- a member can
-- read two programmes at once. Default '{}' so existing rows are valid lists
-- rather than NULL, which a Prisma scalar list cannot represent anyway.
ALTER TABLE "students" ADD COLUMN "study_programmes" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "students" ADD COLUMN "study_years" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "students" ADD COLUMN "study_confirmed_year" INTEGER;
ALTER TABLE "students" ADD COLUMN "not_at_faculty" BOOLEAN;
ALTER TABLE "students" ADD COLUMN "student_number" VARCHAR(255);
ALTER TABLE "students" ADD COLUMN "sso_synced_at" TIMESTAMP(6);

-- The r-number is how a returning student is matched to the row the old LITUS
-- login created for them, so the lookup runs on every SSO sign-in.
CREATE INDEX "students_student_number_idx" ON "students"("student_number");

-- Members outside FIRW sign in through the SSO like anyone else, but the SSO
-- has no study programme for them, so they fill it in during onboarding. This
-- flag is what stops the next login's empty claim from wiping that answer.
ALTER TABLE "students" ADD COLUMN "study_self_reported" BOOLEAN NOT NULL DEFAULT false;
