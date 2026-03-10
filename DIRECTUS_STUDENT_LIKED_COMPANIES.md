# Directus Setup for Student Liked Companies

Students can like companies by clicking a star. This uses the `liked_companies` M2M field on the `students` collection.

## Collection: `students`

Add a Many-to-Many field:

| Field | Type | Related Collection | Notes |
|-------|------|-------------------|-------|
| liked_companies | M2M | company | Companies the student has liked |

The junction table is `students_company` with:
- `students_id` (FK to students)
- `company_id` (FK to company)


## Permissions

Grant the **role used by DIRECTUS_SERVER_TOKEN** these permissions:

| Collection | Permissions |
|------------|-------------|
| `students_company` (junction) | **Read**, **Create**, **Delete** |

The server validates that the authenticated user is a student (via `student_session` cookie) before creating/deleting.
