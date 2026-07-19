ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "invite_token_hash" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "invite_token_created" TIMESTAMPTZ(6);
