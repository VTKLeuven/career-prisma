# Directus Setup for Vacancies

## Overview

The vacancy platform requires four new collections and one junction table. Companies post vacancies that students can browse and respond to. Admins manage the configurable field options (types, sectors, rich-text sections).

---

## 1. `vacancy_types` collection

Dropdown options for vacancy type (e.g. Stage, Job, Studentenjob). Admin-managed.

| Field  | Type    | Interface   | Notes                          |
|--------|---------|-------------|--------------------------------|
| id     | UUID    | (auto)      | Primary key                    |
| name   | String  | Input       | e.g. "Stage", "Job"           |
| sort   | Integer | Input       | Display order                  |
| active | Boolean | Toggle      | Default: true. Inactive types are hidden from company forms |

**Pre-populate** with: Stage, Job, Studentenjob

---

## 2. `vacancy_sectors` collection

Dropdown options for sector. Admin-managed.

| Field  | Type    | Interface   | Notes                          |
|--------|---------|-------------|--------------------------------|
| id     | UUID    | (auto)      | Primary key                    |
| name   | String  | Input       | e.g. "IT", "Consultancy"      |
| sort   | Integer | Input       | Display order                  |
| active | Boolean | Toggle      | Default: true                  |

---

## 3. `vacancy_section_config` collection

Defines which rich-text sections appear on vacancy forms. Each entry becomes a TipTap editor in the company form and a rendered section on the public detail page. Admin-managed.

| Field    | Type    | Interface   | Notes                                     |
|----------|---------|-------------|-------------------------------------------|
| id       | UUID    | (auto)      | Primary key                               |
| key      | String  | Input       | Unique slug, e.g. "description". Used as JSON key in vacancy.sections |
| label    | String  | Input       | Display label, e.g. "Beschrijving"        |
| sort     | Integer | Input       | Display order                             |
| active   | Boolean | Toggle      | Default: true                             |
| required | Boolean | Toggle      | Default: false. When true, companies must fill this section |

**Pre-populate:**

| key              | label           | sort | active | required |
|------------------|-----------------|------|--------|----------|
| description      | Beschrijving    | 1    | true   | true     |
| desired_profile  | Gezocht Profiel | 2    | true   | false    |
| benefits         | Voordelen       | 3    | true   | false    |

Admin can add new sections (e.g. key=`requirements`, label="Vereisten") without any code changes. The frontend dynamically reads active section configs and renders editors/displays accordingly.

---

## 4. `vacancies` collection

The main vacancy/job posting collection.

| Field         | Type              | Interface      | Notes                                                    |
|---------------|-------------------|----------------|----------------------------------------------------------|
| id            | UUID              | (auto)         | Primary key                                              |
| status        | String            | Dropdown       | Options: `draft`, `published`, `archived`. Default: `draft` |
| date_created  | Timestamp         | DateTime       | Auto-filled on creation                                  |
| date_updated  | Timestamp         | DateTime       | Auto-filled on update                                    |
| company       | M2O → company     | Related Values | Required. The company posting this vacancy               |
| title         | String            | Input          | Required. Vacancy title visible to students              |
| type          | M2O → vacancy_types | Related Values | Required. Type of position                            |
| sector        | M2O → vacancy_sectors | Related Values | Required. Business sector                           |
| location      | String            | Input          | Required. Where the position is located                  |
| contact_email | String            | Input          | Required. Email where student applications are sent      |
| contact_name  | String            | Input          | Optional. Contact person name                            |
| contact_phone | String            | Input          | Optional. Contact phone number                           |
| sections      | JSON              | Code           | Rich text content per section key. Example: `{ "description": "<p>...</p>", "desired_profile": "<p>...</p>", "benefits": "<p>...</p>" }` |
| masters       | M2M → master      | (junction)     | Target master degrees (audience)                         |

### M2M junction: `vacancies_masters`

| Field        | Type          | Notes                    |
|--------------|---------------|--------------------------|
| id           | Auto integer  | Primary key              |
| vacancies_id | M2O → vacancies | Foreign key to vacancy |
| master_id    | M2O → master  | Foreign key to master    |

**Directus setup for M2M:**
1. On the `vacancies` collection, create an M2M field called `masters`
2. Related collection: `master`
3. Junction collection: `vacancies_masters`
4. Junction field pointing to vacancies: `vacancies_id`
5. Junction field pointing to master: `master_id`

---

## 5. Next.js: how vacancy reads load `company`

The app **does not** request nested `vacancies → company.name` (etc.) in one query, because some Directus policies allow **direct** reads on the `company` collection but forbid expanding those fields from `vacancies`.

Instead it:

1. Reads `vacancies` with `company` as the foreign key only (plus `type.*`, `sector.*`, `masters.*`), using the same client order as **Companies & Events**: user JWT → `DIRECTUS_SERVER_TOKEN` → public client.
2. Batch-loads `company` rows by id with `readItems("company", { fields: ["id","name","logo","website"], filter: { id: { _in: [...] } } })` and merges them in the API layer.

Ensure the relevant roles/tokens can **read `vacancies`** as needed and can **read** at least `id`, `name`, `logo`, `website` on **`company`** via direct item access. Public listing still relies on published-only filtering in app code where applicable.

---

## 6. Permissions

### Public role
- `vacancy_types`: read (filter: `active = true`)
- `vacancy_sectors`: read (filter: `active = true`)
- `vacancy_section_config`: read (filter: `active = true`)
- `vacancies`: read (filter: `status = "published"`)
- `vacancies_masters`: read
- `master`: read (already configured for other features)
- `company`: read fields `id`, `name`, `logo`, `website` (direct item read for merged vacancy views)

### Company Representative role
All public permissions plus:
- `vacancies`: create, read (filter: `company = $CURRENT_USER.company`), update (filter: `company = $CURRENT_USER.company`), delete (filter: `company = $CURRENT_USER.company`)
- `vacancies_masters`: create, read, update, delete (scoped to own vacancies via custom permissions or handled server-side)
- `vacancy_types`: read
- `vacancy_sectors`: read
- `vacancy_section_config`: read

### Admin role
- Full CRUD on all vacancy-related collections: `vacancies`, `vacancy_types`, `vacancy_sectors`, `vacancy_section_config`, `vacancies_masters`

---

## 7. Notes

- The `sections` JSON field on `vacancies` uses keys from `vacancy_section_config.key`. When an admin adds a new section config (e.g. key="requirements"), companies can fill it when creating/editing vacancies, and it renders on the public detail page — no code deploy needed.
- Company reps set `contact_email`, `contact_name`, `contact_phone` per vacancy. Students can send a message (with attachments like a CV) to the vacancy's `contact_email` via the platform.
- Vacancy `status` workflow: companies create as `draft`, publish when ready (`published`), can archive later (`archived`). Only `published` vacancies are visible to students.
