-- One switch publishes a CV book: `active`. Companies used to see a book only
-- when it was active AND marked "ready for companies" (screening_complete), so
-- a book stays published exactly when both were set -- no company gains or
-- loses a book through this change. screening_complete is no longer read; it
-- is dropped in a later migration, once no running image selects it.
UPDATE "cv_books"
SET "active" = false
WHERE "active" = true AND "screening_complete" IS NOT TRUE;
