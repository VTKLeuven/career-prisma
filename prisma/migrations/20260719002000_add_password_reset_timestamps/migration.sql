ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "password_reset_token_created" TIMESTAMPTZ(6);

ALTER TABLE "students"
  ADD COLUMN IF NOT EXISTS "password_reset_token_created" TIMESTAMP(6);
