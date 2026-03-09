# Directus Setup for Matching Software

To use the Student Matching Software feature, add the following to your Directus instance.

## 1. Collection: `Matching_Software` (or `matching_software`)

The API uses `Matching_Software` (PascalCase). If your Directus collection key differs, update `src/lib/repos/matching-software.ts`.

| Field | Type | Interface | Notes |
|-------|------|-----------|-------|
| id | UUID | - | Auto |
| year | M2O → Academic_Year | | Required |
| event | M2O → career_event | | Required |
| prerequisite_form | M2O → forms | | Optional - form students must fill before matching |
| category_form_fields | JSON | | Optional - array of `{ formId, formVersionId, fieldName }` – master-degrees form fields from company forms. When set, company "interested categories" come from form responses instead of company.category (Settings). Use when companies specify target study fields per event via forms. |
| active | Boolean | Toggle | Default: true |
| companies_can_view_matches | Boolean | Toggle | Default: false. When true, companies can view their matched students in the Matches tab. |

## 2. Collection: `Student_Matching_Response` (or `student_matching_response`)

| Field | Type | Interface | Notes |
|-------|------|-----------|-------|
| id | UUID | - | Auto |
| student | M2O → students | | Required |
| matching_software | M2O → matching_software | | Required |
| riasec_answers | JSON | | { "1": "A", "2": "B", ... } |
| riasec | JSON | | { "R": 25, "I": 16.67, ... } |
| prerequisite_form_response | JSON | | Optional - included form response data |
| general_info_answers | JSON | | { work_preference: string[], company_preference: string[], options_preference: string[] } – multiselect options |
| companies | M2M → company | | Top 30 matched company IDs (auto-filled on submit) |
| matches_last_computed_at | DateTime | | Optional. Set when matches are recomputed. Used to avoid recomputing on every page visit (only once per day when student has matches). |
| submitted_at | DateTime | | Auto on create |

**Unique constraint**: (student, matching_software) - one response per student per matching software.

**Matching logic** (runs on submit): (1) Student's `study_field` (from prerequisite form) must match company's category. (2) General info overlap: count matching options across work preference, company type, and work options. (3) RIASEC→OCIA similarity. Combined score = OCIA score − (general info overlap × 10). Top 30 by combined score.

## 3. Collection: `Company_Matching_Response` (or `company_matching_response`)

| Field | Type | Interface | Notes |
|-------|------|-----------|-------|
| id | UUID | - | Auto |
| company | M2O → company | | Required |
| matching_software | M2O → matching_software | | Required |
| ocia_answers | JSON | | { "1": "A", "2": "B", ... } |
| ocia | JSON | | { "Clan": 25, "Adhocracy": 16.67, ... } |
| general_info_answers | JSON | | { work_preference: string[], company_type: string[], work_options: string[] } – multiselect options |
| students | M2M → students | | Students who matched with this company. **Top 50 by score** – when syncing: (1) Students who matched with the company are ranked by score and the top 50 are kept. (2) If fewer than 50, eligible students (correct study field) are scored the same way and added until the company has 50 matches. **Sync schedule** – company matches are updated daily at 0:00 UTC (cron) or when an admin clicks "Update matches" in Admin → Matching Software. Student submit/recompute does not trigger company sync. |

**Unique constraint**: (company, matching_software) - one response per company per matching software.

**Junction table** (M2M students): When you add the `students` M2M field, Directus creates a junction. Check **Settings → Data Model → company_matching_response → students** to see the exact junction table and field names. Common names: `company_matching_response_students` with `company_matching_response_id` + `students_id`. Grant **Read**, **Create**, **Delete** on the junction to the server token's role. If "Update matches" succeeds but no students appear in Directus, check server logs for `[Matching] updateCompanyMatchingResponseStudents` to see which junction/fields worked or failed.

## 4. Permissions

Uses the same `DIRECTUS_SERVER_TOKEN` as student login. If students can log in, matching software will work. Grant the **role for that token** these permissions:

| Collection | Permissions |
|------------|-------------|
| `Matching_Software` (or `matching_software`) | **Read** |
| `student_matching_response` | **Read**, **Create**, **Update** |
| `student_matching_response_company` (junction) | **Read**, **Create**, **Delete** |
| `company_matching_response` | **Read**, **Create**, **Update** |
| `company_matching_response_students` (junction) | **Read**, **Create**, **Delete** |
| `company` | **Read** (for matching: category, id) |
| `master` | **Read** (for category names) |
| `Academic_Year` | **Read** (for year relation) |
| `career_event` | **Read** (for event relation) |
| `forms` | **Read** (for prerequisite_form relation) |
| `form_versions` | **Read** (for prerequisite check) |
| `form_responses` | **Read** (for prerequisite check) |
| `students` | **Read** (for student relation) |

**Where to set**: Directus → Settings → Access Control → [Role used by DIRECTUS_SERVER_TOKEN] → Matching_Software / student_matching_response / company_matching_response.

**"You don't have permission to access this" (403)**: If you see this in logs when fetching `Company_Matching_Response`, the server token's role lacks **Read** permission on that collection. Grant Read (and Create/Update if companies save matching data) for `company_matching_response` or `Company_Matching_Response` – use the exact collection name from your Directus schema. The code tries both PascalCase and snake_case; one may 403 while the other succeeds. Fix by granting permissions for the collection name your Directus uses.

## 5. Troubleshooting: Duplicate students (count keeps going up)

If company match counts grow each time you run "Update matches":

1. **Check the junction table name** in Directus: Settings → Data Model → `company_matching_response` → `students` field. Note the exact junction collection name (e.g. `company_matching_response_students` or `Company_Matching_Response_Students`).
2. **Ensure Delete permission** on the junction for the server token's role. Without Delete, the pre-clear step cannot empty the table.
3. **Add the junction name** to `COMPANY_STUDENTS_JUNCTION` in `src/lib/repos/matching-software.ts` if your Directus uses a different name than the defaults.
4. Check server logs for `Cleared junction` or `Clear junction ... failed` to see which tables were cleared.

## 6. Troubleshooting: "Update matches" shows 0 students

If the sync reports success but every company has 0 students:

1. **Check server logs** for `[Matching] syncCompanyMatchedStudents: DEBUG` – this shows the actual field names returned by Directus for `student_matching_response`. If `student` or `student_id` is missing, your schema may use a different field name.

2. **Verify junction table** for `student_matching_response.companies`: Settings → Data Model → `student_matching_response` → `companies` field. Note the junction table name and its columns (e.g. `student_matching_response_id`, `company_id`). Ensure the server token's role has **Read** on that junction.

3. **Verify `student` field** on `student_matching_response`: Settings → Data Model → `student_matching_response`. The M2O to `students` may be named `student`, `student_id`, or `students`. The sync supports both UUID strings and integer IDs (Directus may return `student: 950` for auto-increment primary keys).

4. **Confirm matches exist**: In Directus, open `student_matching_response` and a response's `companies` relation. If it's empty, no students have matched that company yet (run matching after students submit).

## 7. Troubleshooting: Companies don't see matches

If the Matches tab is visible but shows no students:

1. **Check server logs** when a company loads the Matches tab:
   - `[Matching] getCompanyMatchingResponseForCompanyViewAction: stripping students (no suboption)` → Company lacks the "Matching Software" suboption. Add it in Directus (company options/sub_options).
   - `[Matching] getCompanyMatchingResponseForCompanyViewAction: returning 0 students` → Junction returned empty. See next steps.
   - `[Matching] fetchStudentsForCompanyMatchingResponse: no junction rows for cmrId` → No rows in the company↔students junction for this company. Run "Update matches" in admin.

2. **Run "Update matches"** in Admin → Matching Software. This syncs student matches into the `company_matching_response_students` junction. If you haven't run it, companies will see 0 matches.

3. **Verify junction table** for `company_matching_response.students`: Settings → Data Model → `company_matching_response` → `students` field. Note the exact junction name and its columns. Add it to `COMPANY_STUDENTS_JUNCTION` in `src/lib/repos/matching-software.ts` if different.

4. **Check `companies_can_view_matches`** on Matching_Software: Admin → Matching Software → toggle "Companies can view matches" on.

## 8. Daily cron (company sync at 0:00 UTC)

Company matches are synced daily at midnight UTC via a cron job. **Vercel**: Add `CRON_SECRET` to Project → Settings → Environment Variables (e.g. `openssl rand -hex 32`). The cron is defined in `vercel.json` and calls `/api/cron/sync-company-matches`. **Self-hosted**: Call `GET /api/cron/sync-company-matches` with `Authorization: Bearer <CRON_SECRET>` at your desired schedule (e.g. via system cron or a scheduler).

## 9. Header buttons

Add `matching_software` to the `header_buttons` JSON field on `career_event_page` (same as floorplan, company_guide, cv_upload): `["matching_software"]`.
