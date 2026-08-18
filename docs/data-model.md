# Data model

`prisma/schema.prisma` (~880 lines, ~55 models) is authoritative. Read it before
guessing. Highlights:

## The yearly cycle

`AcademicYear` → `CareerEvent` → `CareerEventOption` (what a company can buy)
→ `CompanyCareerEventOption` (what a company bought, for a given year).
`CareerSubOption` / `CompanyCareerSubOption` add finer-grained purchases.
Nearly every business question is scoped by academic year.

## The event itself

`CareerEventPage` — public page content, including `latitude`/`longitude`
(formerly a PostGIS point). `Floorplan` → `Booth` → `Zone`/`ZoneBooth`.
`Speaker`, `Timetable`, `Schedule`, `Drink`/`Order`/`OrderingSettings`,
`EventCheckin` and `AttendantScan` (QR badge scanning at booths).

## People

- `User` + `Role` — company representatives and VTK staff. Four roles exist, and
  their names are misleading, so code matches on the **id**, never the name:

  | Role | Id prefix | Who |
  |---|---|---|
  | `Company Rep` | `d5475bf4` | company representatives (the bulk of the table) |
  | `VTK Career` | `7b128ef4` | **sales.** Assignable as a company contact person and listed in the public homepage team section |
  | `Administrator` | `c4e63615` | **internal / support.** Same permissions as VTK Career, never advertised |
  | `Student` | `daf734af` | unused; cannot sign in |

  Only the first three may sign in — see [auth.md](auth.md).
- `Student` — separate table, separate login, separate password column.
  Both password columns are argon2id.
- `CompanyUserRequest` — company reps awaiting admin approval.

## Company-facing products

- `CvBook` / `CvBookScreening` / `CvBookFavourite` — students upload CVs,
  admins screen them, companies request access and favourite candidates.
- `Vacancy` + `VacancyType` / `VacancySector` / `VacancySectorLink` /
  `VacancyMaster` / `VacancySectionConfig` — job board. Behind
  `DEV_ENVIRONMENT`.
- `MatchingSoftware`, `StudentMatchingResponse*`, `CompanyMatchingResponse*` —
  student↔company matching questionnaire.
- `Form` / `FormVersion` / `FormResponse` — the generic form builder used for
  company intake, with a versioned schema.

## Study programmes

`Faculty` → `FacultyMaster` → `Master`, joined to companies via `CompanyMaster`
and to vacancies via `VacancyMaster`.

## Files

`File` rows carry metadata; bytes live on disk under `UPLOADS_DIR`, named by the
row's UUID. Served through `src/app/api/files/[fileId]`.

## Conventions

- Table names are `@@map`ped to snake_case plurals; Prisma model names are
  PascalCase singular.
- Foreign keys are suffixed `_id`.
- `date_created` / `date_updated` exist on most tables (Directus inheritance).
- Migrations live in `prisma/migrations/`. `00000000000000_init` is the
  baseline captured from the Directus database — never edit it.
