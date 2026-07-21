-- Populate the vacancy form with the full engineering-sector catalogue.
-- Existing rows (including the original IT and Chemie rows) are preserved and
-- matched case-insensitively, so this migration is safe for migrated databases.
INSERT INTO "vacancy_sectors" ("id", "name", "sort", "active")
SELECT seed.id::uuid, seed.name, seed.sort, true
FROM (VALUES
  ('7cbd52d5-cd79-4c72-9c6b-ff7177d85201', 'Architectuur & bouw', '01'),
  ('7cbd52d5-cd79-4c72-9c6b-ff7177d85202', 'Artificiële intelligentie', '02'),
  ('7cbd52d5-cd79-4c72-9c6b-ff7177d85203', 'Biomedisch & farma', '03'),
  ('7cbd52d5-cd79-4c72-9c6b-ff7177d85204', 'Chemie', '04'),
  ('7cbd52d5-cd79-4c72-9c6b-ff7177d85205', 'Consultancy', '05'),
  ('7cbd52d5-cd79-4c72-9c6b-ff7177d85206', 'Elektronica & elektrotechniek', '06'),
  ('7cbd52d5-cd79-4c72-9c6b-ff7177d85207', 'Energie & duurzaamheid', '07'),
  ('7cbd52d5-cd79-4c72-9c6b-ff7177d85208', 'Financiën & verzekeringen', '08'),
  ('7cbd52d5-cd79-4c72-9c6b-ff7177d85209', 'IT', '09'),
  ('7cbd52d5-cd79-4c72-9c6b-ff7177d8520a', 'Logistiek & supply chain', '10'),
  ('7cbd52d5-cd79-4c72-9c6b-ff7177d8520b', 'Materialen & nanotechnologie', '11'),
  ('7cbd52d5-cd79-4c72-9c6b-ff7177d8520c', 'Mechanica & mechatronica', '12'),
  ('7cbd52d5-cd79-4c72-9c6b-ff7177d8520d', 'Mobiliteit & transport', '13'),
  ('7cbd52d5-cd79-4c72-9c6b-ff7177d8520e', 'Onderzoek & ontwikkeling', '14'),
  ('7cbd52d5-cd79-4c72-9c6b-ff7177d8520f', 'Overheid & publieke sector', '15'),
  ('7cbd52d5-cd79-4c72-9c6b-ff7177d85210', 'Productie & industrie', '16'),
  ('7cbd52d5-cd79-4c72-9c6b-ff7177d85211', 'Telecom', '17'),
  ('7cbd52d5-cd79-4c72-9c6b-ff7177d85212', 'Andere', '18')
) AS seed(id, name, sort)
WHERE NOT EXISTS (
  SELECT 1
  FROM "vacancy_sectors" existing
  WHERE lower(trim(existing."name")) = lower(seed.name)
);

-- Keep the short legacy IT label active instead of creating a near-duplicate.
UPDATE "vacancy_sectors"
SET "active" = true,
    "sort" = COALESCE("sort", '09')
WHERE lower(trim("name")) = 'it';
