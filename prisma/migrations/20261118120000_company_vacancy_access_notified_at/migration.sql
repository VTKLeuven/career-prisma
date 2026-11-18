-- BR-24: remembers when a company's representatives were last mailed that the
-- company can use the vacancy platform, so a sale only mails once per academic
-- year. Additive and nullable: existing companies start "never notified", and
-- nothing is backfilled -- access that already exists must not trigger a mail.
-- AlterTable
ALTER TABLE "companies" ADD COLUMN "vacancy_access_notified_at" TIMESTAMPTZ(6);
