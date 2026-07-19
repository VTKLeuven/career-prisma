ALTER TABLE "attendant_scans"
  DROP CONSTRAINT IF EXISTS "attendant_scans_company_id_foreign";

ALTER TABLE "attendant_scans"
  ALTER COLUMN "company_id" TYPE UUID USING NULL;

ALTER TABLE "attendant_scans"
  ADD CONSTRAINT "attendant_scans_company_id_foreign"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;
