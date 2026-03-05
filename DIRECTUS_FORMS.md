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
