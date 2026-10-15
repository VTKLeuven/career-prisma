-- AlterTable
ALTER TABLE "students" ADD COLUMN     "study_faculty_ids" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "study_master_ids" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- Students who chose their programme on Career (the same rule as
-- studyEditability(): no SSO, not at the faculty, or vtk.be sent nothing)
-- start with the masters an admin linked to that programme, so their choice
-- carries over to the new masters checklist.
UPDATE "students" AS s
SET "study_master_ids" = picked.ids
FROM (
  SELECT st."id", array_agg(m."id" ORDER BY m."id") AS ids
  FROM "students" AS st
  JOIN "masters" AS m ON m."study_programme" = ANY (st."study_programmes")
  WHERE st."sso_subject" IS NULL
     OR st."not_at_faculty" IS TRUE
     OR cardinality(st."sso_study_programmes") = 0
  GROUP BY st."id"
) AS picked
WHERE s."id" = picked."id";
