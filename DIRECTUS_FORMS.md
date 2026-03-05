# Directus Setup for Forms

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
