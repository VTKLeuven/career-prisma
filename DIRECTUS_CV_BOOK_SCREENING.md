# Directus Setup for CV Book Screening

Admin-only screening of CVs before they are shown to companies.

## Collection: `CV_Book_screening`

| Field | Type | Interface | Notes |
|-------|------|-----------|-------|
| id | UUID | - | Auto |
| cv_book | M2O → CV_Book | Dropdown | Required |
| form_response | M2O → form_responses | Dropdown | Required |
| status | String or JSON | Dropdown | Required. **Choices** (Text = display, Value = stored): Pending → `pending`, Approved → `approved`, Rejected → `rejected`. If Directus only offers JSON type for Dropdown, that works—the app sends values in valid JSON format. |
| study_override | String | Input | Optional – admin-edited field of study |
| screened_at | DateTime | DateTime | Auto on create/update |
| screened_by | M2O → directus_users | User | Optional |

**Unique constraint**: (cv_book, form_response) – one screening record per CV per CV Book.

### Status field choices (Dropdown interface)

In the field's **Interface** → **Choices**, add:

| Text (display) | Value (stored) |
|----------------|-----------------|
| Pending        | pending         |
| Approved       | approved        |
| Rejected       | rejected        |

The app expects these exact values in the database.

## CV_Book: New field

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| screening_complete | Boolean | false | When true, companies can see approved CVs. Set default to false so existing books stay hidden until screened. |

## Troubleshooting: "invalid input syntax for type json"

If you get this error when approving/rejecting CVs:

- **form_response**: Must be **Many-to-One** (UUID), not JSON
- **status**: If the Dropdown only allows JSON type, the app handles it—values are sent as valid JSON
- **study_override**: Must be **String**, not JSON

## Debug: rejected state not persisting

If rejected rows don't stay red after refresh, visit:
`/api/debug/cv-screening?cvBookId={your-cv-book-id}`

Check: `matchCount` vs `studentCount`, `sampleRecord.form_response` vs `sampleStudentId`, `mapKeysSample` vs `studentIdsSample`. If IDs don't match, the `form_response` field in Directus may use a different structure.

## Permissions

Grant the **role used by DIRECTUS_SERVER_TOKEN**:

| Collection | Permissions |
|------------|-------------|
| `CV_Book_screening` | **Read**, **Create**, **Update**, **Delete** |

Ensure `CV_Book` has **Update** for `screening_complete`.
