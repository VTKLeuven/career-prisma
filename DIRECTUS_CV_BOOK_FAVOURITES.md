# Directus Setup for CV Book Favourites

To use the CV Book favourites feature (companies starring student CVs), add the following to your Directus instance.

## Collection: `cv_book_favourite`

| Field | Type | Interface | Notes |
|-------|------|-----------|-------|
| id | UUID | - | Auto |
| company | M2O → company | Dropdown | Required – company that favourited |
| form_response | M2O → form_responses | Dropdown | Required – student's form response (CV entry) |
| cv_book | M2O → CV_Book | Dropdown | Required – which CV book/year |
| date_created | DateTime | - | Auto on create |

**Unique constraint**: (company, form_response, cv_book) – one favourite per company per student per CV book.

## Permissions

Grant the **role used by DIRECTUS_SERVER_TOKEN** these permissions:

| Collection | Permissions |
|------------|--------------|
| `cv_book_favourite` | **Read**, **Create**, **Delete** |

The server validates that the authenticated user's company matches the `company` field before creating/deleting.
