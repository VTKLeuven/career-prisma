-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "academic_years" (
    "id" SERIAL NOT NULL,
    "date_created" TIMESTAMPTZ(6),
    "date_updated" TIMESTAMPTZ(6),
    "start_of_year" TIMESTAMP(6),
    "name" VARCHAR(255),
    "end_of_year" TIMESTAMP(6),

    CONSTRAINT "Academic_Year_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendant_scans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "attendant_uuid" VARCHAR(255),
    "form_response_id" INTEGER,
    "company_id" INTEGER,
    "scanned_by" UUID,
    "scanned_at" TIMESTAMPTZ(6),
    "liked" BOOLEAN NOT NULL DEFAULT false,
    "comment" VARCHAR(255),
    "feedback_updated_at" TIMESTAMP(6),

    CONSTRAINT "attendant_scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booths" (
    "id" SERIAL NOT NULL,
    "coords" JSONB,
    "floorplan_id" INTEGER,
    "company_id" UUID,
    "booth_number" INTEGER,

    CONSTRAINT "Booths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "career_event_option_events" (
    "id" SERIAL NOT NULL,
    "career_event_option_id" UUID,
    "career_event_id" UUID,

    CONSTRAINT "career_event_option_career_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "career_event_option_sub_options" (
    "id" SERIAL NOT NULL,
    "career_event_option_id" UUID,
    "career_sub_option_id" INTEGER,

    CONSTRAINT "career_event_option_career_sub_option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "career_event_options" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "date_created" TIMESTAMPTZ(6),
    "date_updated" TIMESTAMPTZ(6),
    "name" VARCHAR(255),
    "description" TEXT,
    "price" INTEGER,

    CONSTRAINT "career_event_option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "career_event_page_companies" (
    "id" SERIAL NOT NULL,
    "career_event_page_id" INTEGER,
    "company_id" UUID,

    CONSTRAINT "career_event_page_company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "career_event_page_speakers" (
    "id" SERIAL NOT NULL,
    "career_event_page_id" INTEGER,
    "speaker_id" INTEGER,

    CONSTRAINT "career_event_page_speaker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "career_event_page_timetables" (
    "id" SERIAL NOT NULL,
    "career_event_page_id" INTEGER,
    "timetable_id" INTEGER,

    CONSTRAINT "career_event_page_timetable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "career_event_pages" (
    "id" SERIAL NOT NULL,
    "status" VARCHAR(255) NOT NULL DEFAULT 'draft',
    "event_id" UUID,
    "shout" VARCHAR(255),
    "description_EN" TEXT,
    "tagline" VARCHAR(255),
    "address" VARCHAR(255),
    "parking" VARCHAR(255),
    "registration_link" VARCHAR(255),
    "floorplan_id" INTEGER,
    "image_id" UUID,
    "company_guide" UUID,
    "header_buttons" JSONB,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "career_event_page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "career_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "status" VARCHAR(255) NOT NULL DEFAULT 'draft',
    "date_created" TIMESTAMPTZ(6),
    "date_updated" TIMESTAMPTZ(6),
    "name" TEXT,
    "description" TEXT,
    "location" VARCHAR(255),
    "date" DATE,
    "end_hour" TIME(6),
    "start_hour" TIME(6),
    "num_of_companies" INTEGER,
    "num_of_students" INTEGER,
    "image_id" UUID,
    "shout" VARCHAR(255),

    CONSTRAINT "career_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "career_sub_options" (
    "id" SERIAL NOT NULL,
    "date_updated" TIMESTAMPTZ(6),
    "name" VARCHAR(255),
    "description" TEXT,
    "price" VARCHAR(255),

    CONSTRAINT "career_sub_option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "status" VARCHAR(255) NOT NULL DEFAULT 'draft',
    "date_created" TIMESTAMPTZ(6),
    "date_updated" TIMESTAMPTZ(6),
    "name" VARCHAR(255),
    "salesperson_id" UUID,
    "VAT" VARCHAR(255),
    "address_street" VARCHAR(255),
    "address_number" VARCHAR(255),
    "address_zip" VARCHAR(255),
    "address_city" VARCHAR(255),
    "address_country" VARCHAR(255),
    "logo_id" UUID,
    "short_description" TEXT,
    "long_description" TEXT,
    "location" VARCHAR(255),
    "website" VARCHAR(255),
    "page_image" UUID,

    CONSTRAINT "company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_career_event_option" (
    "id" SERIAL NOT NULL,
    "company_id" UUID,
    "career_event_option_id" UUID,

    CONSTRAINT "company_career_event_option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_career_sub_option" (
    "id" SERIAL NOT NULL,
    "company_id" UUID,
    "career_sub_option_id" INTEGER,

    CONSTRAINT "company_career_sub_option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_master" (
    "id" SERIAL NOT NULL,
    "company_id" UUID,
    "master_id" INTEGER,

    CONSTRAINT "company_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_matching_response_students" (
    "id" SERIAL NOT NULL,
    "company_matching_response_id" INTEGER,
    "students_id" INTEGER,

    CONSTRAINT "company_matching_response_students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_matching_responses" (
    "id" SERIAL NOT NULL,
    "date_updated" TIMESTAMPTZ(6),
    "company_id" UUID,
    "matching_software" INTEGER,
    "ocia_answers" JSONB,
    "ocia" JSONB,
    "general_info_answers" JSONB,

    CONSTRAINT "company_matching_response_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_user_requests" (
    "id" SERIAL NOT NULL,
    "status" VARCHAR(255) NOT NULL DEFAULT 'draft',
    "first_name" VARCHAR(255),
    "last_name" VARCHAR(255),
    "email" VARCHAR(255),
    "tel" VARCHAR(255),
    "title" VARCHAR(255),
    "company_id" UUID,

    CONSTRAINT "company_user_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cv_book_favourites" (
    "id" SERIAL NOT NULL,
    "date_created" TIMESTAMPTZ(6),
    "company_id" UUID,
    "form_response" INTEGER,
    "cv_book" INTEGER,

    CONSTRAINT "cv_book_favourite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cv_book_screenings" (
    "id" SERIAL NOT NULL,
    "date_created" TIMESTAMPTZ(6),
    "date_updated" TIMESTAMPTZ(6),
    "cv_book" INTEGER,
    "form_response" INTEGER,
    "status" JSONB,
    "study_override" VARCHAR(255),
    "screened_at" TIMESTAMP(6),
    "screened_by" UUID,

    CONSTRAINT "CV_Book_screening_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cv_books" (
    "id" SERIAL NOT NULL,
    "date_created" TIMESTAMPTZ(6),
    "date_updated" TIMESTAMPTZ(6),
    "year_id" INTEGER,
    "form_id" INTEGER,
    "student_cv_field" VARCHAR(255),
    "student_email_field" VARCHAR(255),
    "student_study_field" VARCHAR(255),
    "student_first_name_field" VARCHAR(255),
    "student_last_name_field" VARCHAR(255),
    "student_first_name_field_backup" VARCHAR(255),
    "student_last_name_field_backup" VARCHAR(255),
    "student_study_field_backup" VARCHAR(255),
    "student_cv_field_backup" VARCHAR(255),
    "student_email_field_backup" VARCHAR(255),
    "active" BOOLEAN DEFAULT false,
    "student_linkedin_field" VARCHAR(255),
    "student_linkedin_field_backup" VARCHAR(255),
    "screening_complete" BOOLEAN DEFAULT false,

    CONSTRAINT "CV_Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drinks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255),
    "type" VARCHAR(255),
    "is_active" BOOLEAN DEFAULT true,
    "image_id" UUID,
    "visible_from" TIME(6),
    "visible_until" TIME(6),

    CONSTRAINT "drinks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_checkins" (
    "id" SERIAL NOT NULL,
    "barcode" VARCHAR(255),
    "event_id" VARCHAR(255),
    "checked_in_at" TIMESTAMP(6),
    "date_created" TIMESTAMPTZ(6),

    CONSTRAINT "event_checkins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faculties" (
    "id" SERIAL NOT NULL,
    "date_created" TIMESTAMPTZ(6),
    "date_updated" TIMESTAMPTZ(6),
    "name" VARCHAR(255),
    "logo_id" UUID,

    CONSTRAINT "faculty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faculty_master" (
    "id" SERIAL NOT NULL,
    "faculty_id" INTEGER,
    "master_id" INTEGER,

    CONSTRAINT "faculty_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "storage" VARCHAR(255) NOT NULL,
    "filename_disk" VARCHAR(255),
    "filename_download" VARCHAR(255) NOT NULL,
    "title" VARCHAR(255),
    "type" VARCHAR(255),
    "folder" UUID,
    "uploaded_by" UUID,
    "created_on" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified_by" UUID,
    "modified_on" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "charset" VARCHAR(50),
    "filesize" BIGINT,
    "width" INTEGER,
    "height" INTEGER,
    "duration" INTEGER,
    "embed" VARCHAR(200),
    "description" TEXT,
    "location" TEXT,
    "tags" TEXT,
    "metadata" JSONB,
    "focal_point_x" INTEGER,
    "focal_point_y" INTEGER,
    "tus_id" VARCHAR(64),
    "tus_data" JSONB,
    "uploaded_on" TIMESTAMPTZ(6),

    CONSTRAINT "directus_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "floorplans" (
    "id" SERIAL NOT NULL,
    "svg_file" UUID,
    "year" VARCHAR(255),
    "name" VARCHAR(255),
    "background_image" UUID,
    "floorplan_category_form_fields" JSONB,
    "floorplan_company_name_form_field" JSONB,

    CONSTRAINT "Floorplan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_responses" (
    "id" SERIAL NOT NULL,
    "form_version_id" INTEGER,
    "data" JSONB NOT NULL,
    "submitted_at" TIMESTAMPTZ(6),
    "attendant_uuid" VARCHAR(255),
    "company_id" UUID,
    "submitter_email" VARCHAR(255),
    "submitter_first_name" VARCHAR(255),
    "submitter_last_name" VARCHAR(255),
    "archived" BOOLEAN DEFAULT false,

    CONSTRAINT "form_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_versions" (
    "id" SERIAL NOT NULL,
    "form_id" INTEGER,
    "version_number" INTEGER NOT NULL,
    "schema" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6),
    "metadata" JSONB,

    CONSTRAINT "form_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forms" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255),
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "masters" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255),
    "logo_id" UUID,
    "short_name" VARCHAR(255),
    "students" INTEGER,
    "modules" TEXT,

    CONSTRAINT "master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matching_software" (
    "id" SERIAL NOT NULL,
    "date_updated" TIMESTAMPTZ(6),
    "year_id" INTEGER,
    "event_id" UUID,
    "prerequisite_form" INTEGER,
    "active" BOOLEAN DEFAULT true,
    "category_form_fields" JSONB,
    "companies_can_view_matches" BOOLEAN DEFAULT false,

    CONSTRAINT "matching_software_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordering_settings" (
    "id" SERIAL NOT NULL,
    "company_ordering_enabled" BOOLEAN DEFAULT false,
    "active_event_id" VARCHAR(255),

    CONSTRAINT "ordering_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" SERIAL NOT NULL,
    "date_created" TIMESTAMPTZ(6),
    "date_updated" TIMESTAMPTZ(6),
    "status" VARCHAR(255) DEFAULT 'pending',
    "items" JSONB,
    "booth_id" INTEGER,
    "shifter_id" UUID,
    "shifter_name" VARCHAR(255),

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "icon" VARCHAR(64) NOT NULL DEFAULT 'supervised_user_circle',
    "description" TEXT,
    "parent_id" UUID,

    CONSTRAINT "directus_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" SERIAL NOT NULL,
    "date_created" TIMESTAMPTZ(6),
    "date_updated" TIMESTAMPTZ(6),
    "pdf_id" UUID,
    "master_id" INTEGER,
    "event_id" UUID,

    CONSTRAINT "schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signage_media" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255),
    "type" VARCHAR(255),
    "file_id" UUID,

    CONSTRAINT "signage_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signage_schedule_slots" (
    "id" SERIAL NOT NULL,
    "screen_id" INTEGER,
    "start_time" TIME(6),
    "end_time" TIME(6),
    "file_id" INTEGER,

    CONSTRAINT "signage_schedule_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signage_screens" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255),
    "slug" VARCHAR(255),
    "status" VARCHAR(255),

    CONSTRAINT "signage_screens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "speakers" (
    "id" SERIAL NOT NULL,
    "date_created" TIMESTAMPTZ(6),
    "date_updated" TIMESTAMPTZ(6),
    "representative_id" UUID,
    "time_id" INTEGER,
    "personal_information" TEXT,
    "content" TEXT,

    CONSTRAINT "speaker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_matching_response_companies" (
    "id" SERIAL NOT NULL,
    "student_matching_response_id" INTEGER,
    "company_id" UUID,

    CONSTRAINT "student_matching_response_company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_matching_responses" (
    "id" SERIAL NOT NULL,
    "date_updated" TIMESTAMPTZ(6),
    "student_id" INTEGER,
    "matching_software" INTEGER,
    "prerequisite_form_response" JSONB,
    "riasec_answers" JSONB,
    "riasec" JSONB,
    "general_info_answers" JSONB,
    "matches_last_computed_at" TIMESTAMP(6),

    CONSTRAINT "student_matching_response_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(255),
    "last_name" VARCHAR(255),
    "full_name" VARCHAR(255),
    "university_status" VARCHAR(255),
    "organization_status" VARCHAR(255),
    "in_workinggroup" BOOLEAN,
    "litus_access_token" VARCHAR(255),
    "litus_token_expires_at" TIMESTAMP(6),
    "date_created" TIMESTAMP(6),
    "date_updated" TIMESTAMP(6),
    "university" VARCHAR(255),
    "verification_token_hash" VARCHAR(255),
    "verification_token_created" TIMESTAMP(6),
    "verified" BOOLEAN,
    "password" VARCHAR(255),
    "password_reset_token" VARCHAR(255),
    "is_shifter" BOOLEAN DEFAULT false,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students_company" (
    "id" SERIAL NOT NULL,
    "students_id" INTEGER,
    "company_id" UUID,

    CONSTRAINT "students_company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timetable_career_event_pages" (
    "id" SERIAL NOT NULL,
    "timetable_id" INTEGER,
    "career_event_page_id" INTEGER,

    CONSTRAINT "timetable_career_event_page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timetables" (
    "id" SERIAL NOT NULL,
    "status" VARCHAR(255) NOT NULL DEFAULT 'draft',
    "date_created" TIMESTAMPTZ(6),
    "title" VARCHAR(255),
    "description" TEXT,
    "start_time" TIME(6),
    "end_time" TIME(6),
    "icon" VARCHAR(255),
    "type" JSONB,
    "speaker_id" INTEGER,

    CONSTRAINT "timetable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "first_name" VARCHAR(50),
    "last_name" VARCHAR(50),
    "email" VARCHAR(128),
    "password" VARCHAR(255),
    "location" VARCHAR(255),
    "title" VARCHAR(50),
    "avatar" UUID,
    "status" VARCHAR(16) NOT NULL DEFAULT 'active',
    "role_id" UUID,
    "last_access" TIMESTAMPTZ(6),
    "tel" VARCHAR(255),
    "company_id" UUID,
    "password_reset_token" VARCHAR(255),

    CONSTRAINT "directus_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacancies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "status" VARCHAR(255) DEFAULT 'draft',
    "date_created" TIMESTAMPTZ(6),
    "date_updated" TIMESTAMPTZ(6),
    "title" VARCHAR(255) NOT NULL,
    "type_id" UUID,
    "sector_id" UUID,
    "location" VARCHAR(255),
    "contact_email" VARCHAR(255),
    "contact_name" VARCHAR(255),
    "contact_phone" VARCHAR(255),
    "sections" JSONB,
    "company_id" UUID,

    CONSTRAINT "vacancies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacancies_master" (
    "id" SERIAL NOT NULL,
    "vacancies_id" UUID,
    "master_id" INTEGER,

    CONSTRAINT "vacancies_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacancies_vacancy_sectors" (
    "id" SERIAL NOT NULL,
    "vacancies_id" UUID,
    "vacancy_sectors_id" UUID,

    CONSTRAINT "vacancies_vacancy_sectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacancy_section_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" VARCHAR(255),
    "label" VARCHAR(255),
    "sort" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "required" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "vacancy_section_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacancy_sectors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255),
    "sort" VARCHAR(255),
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "vacancy_sectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacancy_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "name" VARCHAR(255),
    "sort" INTEGER,

    CONSTRAINT "vacancy_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zone_booths" (
    "id" SERIAL NOT NULL,
    "zone_id" INTEGER,
    "booth_id" INTEGER,

    CONSTRAINT "zones_Booths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zones" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255),
    "dot_color" VARCHAR(255),

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "forms_slug_unique" ON "forms"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "students_username_unique" ON "students"("username");

-- CreateIndex
CREATE UNIQUE INDEX "students_email_unique" ON "students"("email");

-- CreateIndex
CREATE UNIQUE INDEX "directus_users_email_unique" ON "users"("email");

-- AddForeignKey
ALTER TABLE "attendant_scans" ADD CONSTRAINT "attendant_scans_form_response_id_foreign" FOREIGN KEY ("form_response_id") REFERENCES "form_responses"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "attendant_scans" ADD CONSTRAINT "attendant_scans_scanned_by_foreign" FOREIGN KEY ("scanned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "booths" ADD CONSTRAINT "booths_company_foreign" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "booths" ADD CONSTRAINT "booths_floorplan_foreign" FOREIGN KEY ("floorplan_id") REFERENCES "floorplans"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "career_event_option_events" ADD CONSTRAINT "career_event_option_career_event_career_ev__2a952c96_foreign" FOREIGN KEY ("career_event_option_id") REFERENCES "career_event_options"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "career_event_option_events" ADD CONSTRAINT "career_event_option_career_event_career_event_id_foreign" FOREIGN KEY ("career_event_id") REFERENCES "career_events"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "career_event_option_sub_options" ADD CONSTRAINT "career_event_option_career_sub_option_care__1e69f958_foreign" FOREIGN KEY ("career_sub_option_id") REFERENCES "career_sub_options"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "career_event_option_sub_options" ADD CONSTRAINT "career_event_option_career_sub_option_care__743ffebe_foreign" FOREIGN KEY ("career_event_option_id") REFERENCES "career_event_options"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "career_event_page_companies" ADD CONSTRAINT "career_event_page_company_career_event_page_id_foreign" FOREIGN KEY ("career_event_page_id") REFERENCES "career_event_pages"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "career_event_page_companies" ADD CONSTRAINT "career_event_page_company_company_id_foreign" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "career_event_page_speakers" ADD CONSTRAINT "career_event_page_speaker_career_event_page_id_foreign" FOREIGN KEY ("career_event_page_id") REFERENCES "career_event_pages"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "career_event_page_speakers" ADD CONSTRAINT "career_event_page_speaker_speaker_id_foreign" FOREIGN KEY ("speaker_id") REFERENCES "speakers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "career_event_page_timetables" ADD CONSTRAINT "career_event_page_timetable_career_event_page_id_foreign" FOREIGN KEY ("career_event_page_id") REFERENCES "career_event_pages"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "career_event_page_timetables" ADD CONSTRAINT "career_event_page_timetable_timetable_id_foreign" FOREIGN KEY ("timetable_id") REFERENCES "timetables"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "career_event_pages" ADD CONSTRAINT "career_event_page_company_guide_foreign" FOREIGN KEY ("company_guide") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "career_event_pages" ADD CONSTRAINT "career_event_page_event_foreign" FOREIGN KEY ("event_id") REFERENCES "career_events"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "career_event_pages" ADD CONSTRAINT "career_event_page_floorplan_foreign" FOREIGN KEY ("floorplan_id") REFERENCES "floorplans"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "career_event_pages" ADD CONSTRAINT "career_event_page_image_foreign" FOREIGN KEY ("image_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "career_events" ADD CONSTRAINT "career_event_image_foreign" FOREIGN KEY ("image_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "company_logo_foreign" FOREIGN KEY ("logo_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "company_page_image_foreign" FOREIGN KEY ("page_image") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "company_salesperson_foreign" FOREIGN KEY ("salesperson_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "company_career_event_option" ADD CONSTRAINT "company_career_event_option_career_event_option_id_foreign" FOREIGN KEY ("career_event_option_id") REFERENCES "career_event_options"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "company_career_event_option" ADD CONSTRAINT "company_career_event_option_company_id_foreign" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "company_career_sub_option" ADD CONSTRAINT "company_career_sub_option_career_sub_option_id_foreign" FOREIGN KEY ("career_sub_option_id") REFERENCES "career_sub_options"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "company_career_sub_option" ADD CONSTRAINT "company_career_sub_option_company_id_foreign" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "company_master" ADD CONSTRAINT "company_master_company_id_foreign" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "company_master" ADD CONSTRAINT "company_master_master_id_foreign" FOREIGN KEY ("master_id") REFERENCES "masters"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "company_matching_response_students" ADD CONSTRAINT "company_matching_response_students_company__1d3330c9_foreign" FOREIGN KEY ("company_matching_response_id") REFERENCES "company_matching_responses"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "company_matching_response_students" ADD CONSTRAINT "company_matching_response_students_students_id_foreign" FOREIGN KEY ("students_id") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "company_matching_responses" ADD CONSTRAINT "company_matching_response_company_foreign" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "company_matching_responses" ADD CONSTRAINT "company_matching_response_matching_software_foreign" FOREIGN KEY ("matching_software") REFERENCES "matching_software"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "company_user_requests" ADD CONSTRAINT "company_user_requests_company_foreign" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cv_book_favourites" ADD CONSTRAINT "cv_book_favourite_company_foreign" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cv_book_favourites" ADD CONSTRAINT "cv_book_favourite_cv_book_foreign" FOREIGN KEY ("cv_book") REFERENCES "cv_books"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cv_book_favourites" ADD CONSTRAINT "cv_book_favourite_form_response_foreign" FOREIGN KEY ("form_response") REFERENCES "form_responses"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cv_book_screenings" ADD CONSTRAINT "cv_book_screening_cv_book_foreign" FOREIGN KEY ("cv_book") REFERENCES "cv_books"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cv_book_screenings" ADD CONSTRAINT "cv_book_screening_form_response_foreign" FOREIGN KEY ("form_response") REFERENCES "form_responses"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cv_book_screenings" ADD CONSTRAINT "cv_book_screening_screened_by_foreign" FOREIGN KEY ("screened_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cv_books" ADD CONSTRAINT "cv_book_form_foreign" FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cv_books" ADD CONSTRAINT "cv_book_year_foreign" FOREIGN KEY ("year_id") REFERENCES "academic_years"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "drinks" ADD CONSTRAINT "drinks_image_foreign" FOREIGN KEY ("image_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "faculties" ADD CONSTRAINT "faculty_logo_foreign" FOREIGN KEY ("logo_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "faculty_master" ADD CONSTRAINT "faculty_master_faculty_id_foreign" FOREIGN KEY ("faculty_id") REFERENCES "faculties"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "faculty_master" ADD CONSTRAINT "faculty_master_master_id_foreign" FOREIGN KEY ("master_id") REFERENCES "masters"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "directus_files_modified_by_foreign" FOREIGN KEY ("modified_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "directus_files_uploaded_by_foreign" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "floorplans" ADD CONSTRAINT "floorplan_background_image_foreign" FOREIGN KEY ("background_image") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "floorplans" ADD CONSTRAINT "floorplan_svg_file_foreign" FOREIGN KEY ("svg_file") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "form_responses" ADD CONSTRAINT "form_responses_company_id_foreign" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "form_responses" ADD CONSTRAINT "form_responses_form_version_id_foreign" FOREIGN KEY ("form_version_id") REFERENCES "form_versions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "form_versions" ADD CONSTRAINT "form_versions_form_id_foreign" FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "masters" ADD CONSTRAINT "master_logo_foreign" FOREIGN KEY ("logo_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "matching_software" ADD CONSTRAINT "matching_software_event_foreign" FOREIGN KEY ("event_id") REFERENCES "career_events"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "matching_software" ADD CONSTRAINT "matching_software_prerequisite_form_foreign" FOREIGN KEY ("prerequisite_form") REFERENCES "forms"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "matching_software" ADD CONSTRAINT "matching_software_year_foreign" FOREIGN KEY ("year_id") REFERENCES "academic_years"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_booth_foreign" FOREIGN KEY ("booth_id") REFERENCES "booths"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_shifter_foreign" FOREIGN KEY ("shifter_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "directus_roles_parent_foreign" FOREIGN KEY ("parent_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedule_event_foreign" FOREIGN KEY ("event_id") REFERENCES "career_events"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedule_master_foreign" FOREIGN KEY ("master_id") REFERENCES "masters"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedule_pdf_foreign" FOREIGN KEY ("pdf_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "signage_media" ADD CONSTRAINT "signage_media_file_foreign" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "signage_schedule_slots" ADD CONSTRAINT "signage_schedule_slots_file_foreign" FOREIGN KEY ("file_id") REFERENCES "signage_media"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "signage_schedule_slots" ADD CONSTRAINT "signage_schedule_slots_screen_foreign" FOREIGN KEY ("screen_id") REFERENCES "signage_screens"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "speakers" ADD CONSTRAINT "speaker_representative_foreign" FOREIGN KEY ("representative_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "speakers" ADD CONSTRAINT "speaker_time_foreign" FOREIGN KEY ("time_id") REFERENCES "timetables"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_matching_response_companies" ADD CONSTRAINT "student_matching_response_company_company_id_foreign" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_matching_response_companies" ADD CONSTRAINT "student_matching_response_company_student___18993dce_foreign" FOREIGN KEY ("student_matching_response_id") REFERENCES "student_matching_responses"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_matching_responses" ADD CONSTRAINT "student_matching_response_matching_software_foreign" FOREIGN KEY ("matching_software") REFERENCES "matching_software"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_matching_responses" ADD CONSTRAINT "student_matching_response_student_foreign" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "students_company" ADD CONSTRAINT "students_company_company_id_foreign" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "students_company" ADD CONSTRAINT "students_company_students_id_foreign" FOREIGN KEY ("students_id") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "timetable_career_event_pages" ADD CONSTRAINT "timetable_career_event_page_career_event_page_id_foreign" FOREIGN KEY ("career_event_page_id") REFERENCES "career_event_pages"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "timetable_career_event_pages" ADD CONSTRAINT "timetable_career_event_page_timetable_id_foreign" FOREIGN KEY ("timetable_id") REFERENCES "timetables"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "timetables" ADD CONSTRAINT "timetable_speaker_foreign" FOREIGN KEY ("speaker_id") REFERENCES "speakers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "directus_users_company_foreign" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "directus_users_role_foreign" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vacancies" ADD CONSTRAINT "vacancies_company_foreign" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vacancies" ADD CONSTRAINT "vacancies_sector_foreign" FOREIGN KEY ("sector_id") REFERENCES "vacancy_sectors"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vacancies" ADD CONSTRAINT "vacancies_type_foreign" FOREIGN KEY ("type_id") REFERENCES "vacancy_types"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vacancies_master" ADD CONSTRAINT "vacancies_master_master_id_foreign" FOREIGN KEY ("master_id") REFERENCES "masters"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vacancies_master" ADD CONSTRAINT "vacancies_master_vacancies_id_foreign" FOREIGN KEY ("vacancies_id") REFERENCES "vacancies"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vacancies_vacancy_sectors" ADD CONSTRAINT "vacancies_vacancy_sectors_vacancies_id_foreign" FOREIGN KEY ("vacancies_id") REFERENCES "vacancies"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vacancies_vacancy_sectors" ADD CONSTRAINT "vacancies_vacancy_sectors_vacancy_sectors_id_foreign" FOREIGN KEY ("vacancy_sectors_id") REFERENCES "vacancy_sectors"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "zone_booths" ADD CONSTRAINT "zones_booths_booths_id_foreign" FOREIGN KEY ("booth_id") REFERENCES "booths"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "zone_booths" ADD CONSTRAINT "zones_booths_zones_id_foreign" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
