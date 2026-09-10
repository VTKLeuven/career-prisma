-- DropForeignKey
ALTER TABLE "company_career_event_option" DROP CONSTRAINT "company_career_event_option_academic_year_id_foreign";

-- DropForeignKey
ALTER TABLE "company_career_event_option" DROP CONSTRAINT "company_career_event_option_career_event_option_id_foreign";

-- DropForeignKey
ALTER TABLE "company_career_event_option" DROP CONSTRAINT "company_career_event_option_company_id_foreign";

-- DropForeignKey
ALTER TABLE "company_career_sub_option" DROP CONSTRAINT "company_career_sub_option_academic_year_id_foreign";

-- DropForeignKey
ALTER TABLE "company_career_sub_option" DROP CONSTRAINT "company_career_sub_option_career_sub_option_id_foreign";

-- DropForeignKey
ALTER TABLE "company_career_sub_option" DROP CONSTRAINT "company_career_sub_option_company_id_foreign";

-- AddForeignKey
ALTER TABLE "company_career_event_option" ADD CONSTRAINT "company_career_event_option_career_event_option_id_foreign" FOREIGN KEY ("career_event_option_id") REFERENCES "career_event_options"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "company_career_event_option" ADD CONSTRAINT "company_career_event_option_company_id_foreign" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "company_career_event_option" ADD CONSTRAINT "company_career_event_option_academic_year_id_foreign" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "company_career_sub_option" ADD CONSTRAINT "company_career_sub_option_career_sub_option_id_foreign" FOREIGN KEY ("career_sub_option_id") REFERENCES "career_sub_options"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "company_career_sub_option" ADD CONSTRAINT "company_career_sub_option_company_id_foreign" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "company_career_sub_option" ADD CONSTRAINT "company_career_sub_option_academic_year_id_foreign" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- RenameIndex
ALTER INDEX "company_career_event_option_company_option_year_key" RENAME TO "company_career_event_option_company_id_career_event_option__key";

-- RenameIndex
ALTER INDEX "company_career_sub_option_company_suboption_year_key" RENAME TO "company_career_sub_option_company_id_career_sub_option_id_a_key";
