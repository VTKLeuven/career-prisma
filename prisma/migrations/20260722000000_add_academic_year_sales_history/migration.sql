-- Annual event/option editions and immutable company sales history.
-- Existing records belong to academic year 2025-2026, as confirmed during migration planning.

DO $$
DECLARE
  target_year_id INTEGER;
BEGIN
  SELECT id INTO target_year_id
  FROM academic_years
  WHERE lower(coalesce(name, '')) IN ('2025-2026', '2025–2026', '25-26', '25–26')
     OR (start_of_year::date <= DATE '2025-09-01' AND end_of_year::date >= DATE '2026-06-30')
  ORDER BY start_of_year DESC NULLS LAST
  LIMIT 1;

  IF target_year_id IS NULL THEN
    INSERT INTO academic_years (date_created, date_updated, start_of_year, end_of_year, name)
    VALUES (now(), now(), TIMESTAMP '2025-09-01', TIMESTAMP '2026-08-31 23:59:59', '2025-2026')
    RETURNING id INTO target_year_id;
  END IF;

  ALTER TABLE career_events ADD COLUMN IF NOT EXISTS academic_year_id INTEGER;
  ALTER TABLE career_events ADD COLUMN IF NOT EXISTS series_key VARCHAR(255);
  ALTER TABLE career_event_options ADD COLUMN IF NOT EXISTS academic_year_id INTEGER;
  ALTER TABLE career_event_options ADD COLUMN IF NOT EXISTS series_key VARCHAR(255);

  UPDATE career_events
  SET academic_year_id = target_year_id
  WHERE academic_year_id IS NULL;

  UPDATE career_events
  SET series_key = trim(both '-' from regexp_replace(
    translate(lower(coalesce(name, id::text)), 'áàâäãåçéèêëíìîïñóòôöõúùûüýÿ', 'aaaaaaceeeeiiiinooooouuuuyy'),
    '[^a-z0-9]+', '-', 'g'
  ))
  WHERE series_key IS NULL OR series_key = '';

  UPDATE career_event_options
  SET academic_year_id = target_year_id
  WHERE academic_year_id IS NULL;

  UPDATE career_event_options
  SET series_key = trim(both '-' from regexp_replace(
    translate(lower(coalesce(name, id::text)), 'áàâäãåçéèêëíìîïñóòôöõúùûüýÿ', 'aaaaaaceeeeiiiinooooouuuuyy'),
    '[^a-z0-9]+', '-', 'g'
  ))
  WHERE series_key IS NULL OR series_key = '';

  ALTER TABLE company_career_event_option ADD COLUMN IF NOT EXISTS academic_year_id INTEGER;
  ALTER TABLE company_career_event_option ADD COLUMN IF NOT EXISTS price_at_sale INTEGER;
  ALTER TABLE company_career_event_option ADD COLUMN IF NOT EXISTS name_at_sale VARCHAR(255);
  ALTER TABLE company_career_event_option ADD COLUMN IF NOT EXISTS date_created TIMESTAMPTZ(6) NOT NULL DEFAULT now();
  ALTER TABLE company_career_event_option ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'sold';

  UPDATE company_career_event_option link
  SET academic_year_id = coalesce(option.academic_year_id, target_year_id),
      price_at_sale = coalesce(link.price_at_sale, option.price),
      name_at_sale = coalesce(link.name_at_sale, option.name)
  FROM career_event_options option
  WHERE option.id = link.career_event_option_id
    AND link.academic_year_id IS NULL;

  UPDATE company_career_event_option
  SET academic_year_id = target_year_id
  WHERE academic_year_id IS NULL;

  ALTER TABLE company_career_sub_option ADD COLUMN IF NOT EXISTS academic_year_id INTEGER;
  ALTER TABLE company_career_sub_option ADD COLUMN IF NOT EXISTS price_at_sale VARCHAR(255);
  ALTER TABLE company_career_sub_option ADD COLUMN IF NOT EXISTS name_at_sale VARCHAR(255);
  ALTER TABLE company_career_sub_option ADD COLUMN IF NOT EXISTS date_created TIMESTAMPTZ(6) NOT NULL DEFAULT now();
  ALTER TABLE company_career_sub_option ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'sold';

  UPDATE company_career_sub_option link
  SET academic_year_id = target_year_id,
      price_at_sale = coalesce(link.price_at_sale, sub.price),
      name_at_sale = coalesce(link.name_at_sale, sub.name)
  FROM career_sub_options sub
  WHERE sub.id = link.career_sub_option_id
    AND link.academic_year_id IS NULL;

  UPDATE company_career_sub_option
  SET academic_year_id = target_year_id
  WHERE academic_year_id IS NULL;
END $$;

-- Invalid legacy junction rows cannot form a meaningful historical sale.
DELETE FROM company_career_event_option
WHERE company_id IS NULL OR career_event_option_id IS NULL OR academic_year_id IS NULL;

DELETE FROM company_career_sub_option
WHERE company_id IS NULL OR career_sub_option_id IS NULL OR academic_year_id IS NULL;

-- Remove exact duplicate legacy assignments before enforcing annual uniqueness.
DELETE FROM company_career_event_option duplicate
USING company_career_event_option keeper
WHERE duplicate.id > keeper.id
  AND duplicate.company_id = keeper.company_id
  AND duplicate.career_event_option_id = keeper.career_event_option_id
  AND duplicate.academic_year_id = keeper.academic_year_id;

DELETE FROM company_career_sub_option duplicate
USING company_career_sub_option keeper
WHERE duplicate.id > keeper.id
  AND duplicate.company_id = keeper.company_id
  AND duplicate.career_sub_option_id = keeper.career_sub_option_id
  AND duplicate.academic_year_id = keeper.academic_year_id;

ALTER TABLE company_career_event_option ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE company_career_event_option ALTER COLUMN career_event_option_id SET NOT NULL;
ALTER TABLE company_career_event_option ALTER COLUMN academic_year_id SET NOT NULL;
ALTER TABLE company_career_sub_option ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE company_career_sub_option ALTER COLUMN career_sub_option_id SET NOT NULL;
ALTER TABLE company_career_sub_option ALTER COLUMN academic_year_id SET NOT NULL;

ALTER TABLE career_events
  ADD CONSTRAINT career_events_academic_year_id_foreign
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON UPDATE NO ACTION ON DELETE SET NULL;

ALTER TABLE career_event_options
  ADD CONSTRAINT career_event_options_academic_year_id_foreign
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON UPDATE NO ACTION ON DELETE SET NULL;

ALTER TABLE company_career_event_option
  ADD CONSTRAINT company_career_event_option_academic_year_id_foreign
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON UPDATE NO ACTION ON DELETE NO ACTION;

ALTER TABLE company_career_sub_option
  ADD CONSTRAINT company_career_sub_option_academic_year_id_foreign
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON UPDATE NO ACTION ON DELETE NO ACTION;

CREATE INDEX career_events_academic_year_id_idx ON career_events(academic_year_id);
CREATE INDEX career_events_series_key_idx ON career_events(series_key);
CREATE INDEX career_event_options_academic_year_id_idx ON career_event_options(academic_year_id);
CREATE INDEX career_event_options_series_key_idx ON career_event_options(series_key);
CREATE INDEX company_career_event_option_academic_year_id_idx ON company_career_event_option(academic_year_id);
CREATE INDEX company_career_sub_option_academic_year_id_idx ON company_career_sub_option(academic_year_id);

CREATE UNIQUE INDEX company_career_event_option_company_option_year_key
  ON company_career_event_option(company_id, career_event_option_id, academic_year_id);
CREATE UNIQUE INDEX company_career_sub_option_company_suboption_year_key
  ON company_career_sub_option(company_id, career_sub_option_id, academic_year_id);
