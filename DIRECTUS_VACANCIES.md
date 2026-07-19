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
| sector        | M2O → vacancy_sectors | Related Values | **Legacy / primary:** the app sets this **server-side** to the first M2M sector when saving (companies only send `sectors`). Optional in Directus if you drop the field later. |
| sectors       | M2M → vacancy_sectors | (junction)     | **Source of truth:** one or more sectors per vacancy (see `vacancies_sectors` below). |
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

### M2M junction: `vacancies_sectors` (multiple sectors per vacancy)

| Field          | Type              | Notes                                      |
|----------------|-------------------|--------------------------------------------|
| id             | Auto integer      | Primary key (this is normal — **no need** to change it to UUID) |
| vacancies_id   | M2O → vacancies   | Foreign key to vacancy (UUID if `vacancies.id` is UUID) |
| (see below)    | M2O → vacancy_sectors | **Must be UUID** (same type as `vacancy_sectors.id`) |

**Primary key `id`:** an **integer** junction PK is normal. The earlier “integer vs UUID” error referred to a **foreign key column** receiving a UUID (wrong field), not to the junction PK.

Directus usually creates **`vacancy_sectors_id`** (M2O → `vacancy_sectors`). Some teams add or rename a field **`sector_id`** — that name must still be a **UUID** foreign key to `vacancy_sectors`. If `sector_id` is accidentally a different type (e.g. integer), inserts will fail (see troubleshooting).

**Setup checklist**

1. Junction collection `vacancies_sectors` with M2O to `vacancies` and M2O to `vacancy_sectors` (or use Directus “Create M2M” on `vacancies` → `sectors`).
2. On `vacancies`, M2M **`sectors`** → `vacancy_sectors` via that junction.
3. **One env for read + nested write shape:** `DIRECTUS_VACANCY_SECTORS_JUNCTION_FK` (default `vacancy_sectors_id`) must be the **actual UUID M2O field name** on `vacancies_sectors` pointing at `vacancy_sectors`. The app builds **`sectors.<that_field>.*`** for reads and sends **`sectors`** on `vacancies` the same way as **`masters`**: an array of `{ "<that_fk>": "<vacancy_sectors_uuid>" }`. If you only have `sector_id` (UUID), set `DIRECTUS_VACANCY_SECTORS_JUNCTION_FK=sector_id`.
4. Optional: `DIRECTUS_VACANCIES_SECTORS_JUNCTION_SECTOR_FKS` (comma-separated) only if **multiple** UUID columns must receive the same sector id (rare).

**How the app saves sectors:** identical pattern to **`masters`** — nested payload on **`POST/PATCH /items/vacancies`**, not separate calls to `vacancies_sectors`. Permissions for company users should therefore match what already works for **`vacancies_masters`** (create/read/update/delete on the junction for rows linked to their vacancies, or equivalent relational access through `vacancies` update).

### Troubleshooting: `invalid input syntax for type integer` + a UUID

PostgreSQL is saying a **UUID string** was written into a column typed as **integer**. Almost always the **wrong junction field** is used for the sector link.

| Check | Action |
|--------|--------|
| 1. Open **Directus → Data model → `vacancies_sectors`**. | List every field that points to `vacancy_sectors`. Note the exact field key (often `vacancy_sectors_id`). |
| 2. Check **field type** for that key. | It must match **`vacancy_sectors.id`** (usually UUID). |
| 3. If you see **`sector_id` as Integer** (or any non-UUID) | Either delete/fix that field and use the proper M2O UUID to `vacancy_sectors`, **or** set `.env` so the app uses the correct key: `DIRECTUS_VACANCY_SECTORS_JUNCTION_FK=vacancy_sectors_id` (default in code) or `=sector_id` only if that field is the real UUID FK. |
| 4. **Reads show no sectors** | Align `VACANCY_READ_FIELDS` in `vacancies.ts` with the same FK name you use in the DB (`sectors.vacancy_sectors_id.*` vs `sectors.sector_id.*`). Requesting a non-existent nested field will error in Directus. |
| 5. **Permissions** | Role must be allowed to **create/delete** rows in `vacancies_sectors` (not only on `vacancies`). |

### Troubleshooting: M2M “Sectors” rows show `--` in Directus

Junction rows exist, but the link to **`vacancy_sectors`** is empty or the wrong column is filled.

1. In **Data model → `vacancies_sectors`**, check which field is the real M2O to **`vacancy_sectors`** (UUID). Set `DIRECTUS_VACANCY_SECTORS_JUNCTION_FK` to that field name so the app sends the same key as **`master_id`** for masters.
2. If Studio still shows `--` after deploy, the UI may be bound to a **second** field (e.g. `sector_id`) while only `vacancy_sectors_id` was filled. If **both** columns are UUID foreign keys to `vacancy_sectors`, set in `.env`:  
   `DIRECTUS_VACANCIES_SECTORS_JUNCTION_SECTOR_FKS=vacancy_sectors_id,sector_id`  
   **Do not** list an integer `sector_id` here — that will error again.
3. Remove broken junction rows (all `--`) once, save again from the app, and confirm new rows show sector names.

**Permissions:** same as `vacancies_masters` — company role needs create/read/update/delete on `vacancies_sectors` for own vacancies (or equivalent policies).

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
- `vacancies_sectors`: read
- `master`: read (already configured for other features)
- `company`: read fields `id`, `name`, `logo`, `website` (direct item read for merged vacancy views)

### Company Representative role
All public permissions plus:
- `vacancies`: create, read (filter: `company = $CURRENT_USER.company`), update (filter: `company = $CURRENT_USER.company`), delete (filter: `company = $CURRENT_USER.company`)
- `vacancies_masters`: create, read, update, delete (scoped to own vacancies via custom permissions or handled server-side)
- `vacancies_sectors`: create, read, update, delete (same scoping as masters)
- `vacancy_types`: read
- `vacancy_sectors`: read
- `vacancy_section_config`: read

### How to verify company (rep) access in Directus

1. **Settings → Access Control → Roles**  
   Open the role your company users use (e.g. *Company Representative*, *Company*, … — the same role the app assigns after login).

2. **Per collection, open the role’s permissions** and confirm at least:

   | Collection | Company role needs |
   |------------|-------------------|
   | `vacancies` | **Create**, **Read**, **Update**, **Delete** with a rule so rows are limited to **their** company (e.g. Item Permissions: `company` **equals** `$CURRENT_USER.company`, or your equivalent dynamic variable). |
   | `vacancies_sectors` | **Create**, **Read**, **Update**, **Delete** on junction rows for their vacancies (same scoping as **`vacancies_masters`**). Nested `sectors` on `vacancies` updates need the same junction access as nested `masters`. |
   | `vacancies_masters` | Same idea as `vacancies_sectors` if reps pick masters on vacancies. |
   | `vacancy_types`, `vacancy_sectors`, `vacancy_section_config` | **Read** (often with filter `active = true` where applicable). |

3. **Field-level permissions**  
   Under each collection permission, check **Field Permissions**: the fields the Next.js app sends (title, type, location, `sections`, `contact_*`, etc.) must be readable/writable for create/update. If a field is “no access”, saves can partially fail or look broken.

4. **Smoke test as a real company user**  
   - Log in on the career site as a **company** user (not admin).  
   - Create or edit a vacancy, change sectors, save.  
   - If you get **403** or silent failures, open **Directus → Users** for that user: confirm **role** and **company** are set. Then in the browser **Network** tab, inspect failed calls to your API / server actions — the error body often echoes Directus “permission denied” or a field name.

5. **Compare with Admin**  
   If the same action **works** when you use an **admin** token but **not** as company, the gap is almost always **role permissions** or **missing `$CURRENT_USER.company`** on the user record.

### Admin role
- Full CRUD on all vacancy-related collections: `vacancies`, `vacancy_types`, `vacancy_sectors`, `vacancy_section_config`, `vacancies_masters`, `vacancies_sectors`

---

## 7. Notes

- The `sections` JSON field on `vacancies` uses keys from `vacancy_section_config.key`. When an admin adds a new section config (e.g. key="requirements"), companies can fill it when creating/editing vacancies, and it renders on the public detail page — no code deploy needed.
- Company reps set `contact_email`, `contact_name`, `contact_phone` per vacancy. Students can send a message (with attachments like a CV) to the vacancy's `contact_email` via the platform.
- Vacancy `status` workflow: companies create as `draft`, publish when ready (`published`), can archive later (`archived`). Only `published` vacancies are visible to students.
