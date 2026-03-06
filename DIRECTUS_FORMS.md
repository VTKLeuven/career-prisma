# Directus Setup for Forms

## master-degrees field type

The **Master Degrees** form field type loads options from Directus collections. It requires:

### master collection
- Must exist with at least `id` and `name` fields.
- Used as the default source of options (master names).

### faculty collection (optional, for "Add faculties" mode)
When the form builder enables "Add faculties", options are built from the faculty collection:

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| name | String | Faculty name (e.g. "Engineering Science", "Bio Engineering", "Other") |
| masters | M2M relation | Junction to master (e.g. `faculty_master` with `master_id`) |

**Directus setup:**
1. Create collection `faculty` (or `Faculty`) with fields `id`, `name`
2. Create M2M relation: faculty ↔ master. Name the relation field `masters` (or `faculty_master`)
3. The junction should have `master_id` pointing to master

**Option labels (output format):**
- Faculty with masters: `Fac. {faculty.name} - {master.name}` (e.g. "Fac. Engineering Science - Architectural Engineering")
- Faculty with no masters: `Fac. {faculty.name}` (e.g. "Fac. Science")
- Faculty named "Other": `Other` (no "Fac." prefix)

The code tries these field patterns: `masters.master_id`, `faculty_master.master_id`, `faculty_masters.master_id`, `masters`, `master`

**Optional:** Add `logo` to both `faculty` and `master` collections for floorplan category logos and popup display.

---

## Floorplan categories from forms

When using master-degrees form fields for the floorplan, add a JSON field to the `Floorplan` collection:

| Field | Type | Notes |
|-------|------|-------|
| floorplan_category_form_fields | JSON | Array of `{ formId, formVersionId, fieldName }` – master-degrees fields from company forms |
| floorplan_company_name_form_field | JSON | Array of `{ formId, formVersionId, fieldName }` – form fields to use as company display name on the floorplan (tried in order; first non-empty wins) |

Configure these in Admin → Floorplan. When `floorplan_category_form_fields` is set, the public floorplan shows a master dropdown instead of category logos, and companies are filtered by their form responses. Company popups show faculty/master logos from the form data. When `floorplan_company_name_form_field` is set, the tooltip and popup show the form field value instead of the default company name (multiple forms are tried in order; first non-empty value wins).

---

## form_responses collection – archived field

For student forms, when a student submits a new response, their previous responses are automatically archived. Only the most recent response per student is shown in the UI and counts.

**Add the following field to the `form_responses` collection** (required for the archiving feature):

| Field    | Type    | Interface | Notes                                                      |
|----------|---------|-----------|------------------------------------------------------------|
| archived | Boolean | Toggle    | Default: false. When true, response is hidden from lists and counts. |

**Migration for existing data:** Existing responses have `archived` as null/false and are treated as active. No migration needed.

**Behavior:** When a logged-in student submits a form, all their previous responses for that form (any version) are set to `archived: true`. The new response is created with `archived: false` (default). Archived responses are excluded from:
- Admin form responses list
- Response counts
- Form capacity checks (max_entries)
- CV Book data
- Student's "latest response" lookup (for prefill)

---

## Career event speakers

The career event page supports optional speakers (M2M with the `speaker` collection).

**speaker collection:**
| Field | Type | Notes |
|-------|------|-------|
| personal_information | WYSIWYG/HTML | Bio, title, etc. Shown on speaker detail page |
| content | WYSIWYG/HTML | Talk abstract / what they'll speak about |
| representative | M2O → directus_users | User (first_name, last_name, avatar, company) |
| time | M2O → timetable | Timetable slot (title, start_time, end_time) |

**career_event_page:** Add M2M field `speakers` linking to `speaker`. The junction table typically has `speaker_id` pointing to speaker.

**Display:** Speaker cards (section title "Discovery Stage") show a square photo with time overlay (top right), name and company logo + name below. When a speaker has no company (e.g. PhD), "KU Leuven" with its logo is shown as fallback.
