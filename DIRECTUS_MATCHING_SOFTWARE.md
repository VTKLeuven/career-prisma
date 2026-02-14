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
| active | Boolean | Toggle | Default: true |

## 2. Collection: `Student_Matching_Response` (or `student_matching_response`)

| Field | Type | Interface | Notes |
|-------|------|-----------|-------|
| id | UUID | - | Auto |
| student | M2O → students | | Required |
| matching_software | M2O → matching_software | | Required |
| riasec_answers | JSON | | { "1": "A", "2": "B", ... } |
| riasec | JSON | | { "R": 25, "I": 16.67, ... } |
| prerequisite_form_response | JSON | | Optional - included form response data |
| companies | M2M → company | | Top 30 matched company IDs (auto-filled on submit) |
| submitted_at | DateTime | | Auto on create |

**Unique constraint**: (student, matching_software) - one response per student per matching software.

**Matching logic** (runs on submit): Student's `study_field` (from prerequisite form data, keys: `study_field`, `study`, `master`, `program`) must match company's category (master name). If no match, company's "Other" counts only when the student's study field is not in any of the company's categories (or when both student and company have "Other"). RIASEC→OCIA: Clan=S+A, Adhocracy=A+E, Market=R+E, Hierarchy=C+I. Top 30 by OCIA similarity.

## 3. Collection: `Company_Matching_Response` (or `company_matching_response`)

| Field | Type | Interface | Notes |
|-------|------|-----------|-------|
| id | UUID | - | Auto |
| company | M2O → company | | Required |
| matching_software | M2O → matching_software | | Required |
| ocia_answers | JSON | | { "1": "A", "2": "B", ... } |
| ocia | JSON | | { "Clan": 25, "Adhocracy": 16.67, ... } |

**Unique constraint**: (company, matching_software) - one response per company per matching software.

## 4. Permissions

Uses the same `DIRECTUS_SERVER_TOKEN` as student login. If students can log in, matching software will work. Grant the **role for that token** these permissions:

| Collection | Permissions |
|------------|-------------|
| `Matching_Software` (or `matching_software`) | **Read** |
| `student_matching_response` | **Read**, **Create**, **Update** |
| `student_matching_response_company` (junction) | **Read**, **Create**, **Delete** |
| `company_matching_response` | **Read**, **Create**, **Update** |
| `company` | **Read** (for matching: category, id) |
| `master` | **Read** (for category names) |
| `Academic_Year` | **Read** (for year relation) |
| `career_event` | **Read** (for event relation) |
| `forms` | **Read** (for prerequisite_form relation) |
| `form_versions` | **Read** (for prerequisite check) |
| `form_responses` | **Read** (for prerequisite check) |
| `students` | **Read** (for student relation) |

**Where to set**: Directus → Settings → Access Control → [Role used by DIRECTUS_SERVER_TOKEN] → Matching_Software / student_matching_response / company_matching_response.

## 5. Header buttons

Add `matching_software` to the `header_buttons` JSON field on `career_event_page` (same as floorplan, company_guide, cv_upload): `["matching_software"]`.
