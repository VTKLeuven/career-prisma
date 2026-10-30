# Data model

`prisma/schema.prisma` (~880 lines, ~55 models) is authoritative. Read it before
guessing. Highlights:

## The yearly cycle

`AcademicYear` → `CareerEvent` → `CareerEventOption` (what a company can buy)
→ `CompanyCareerEventOption` (what a company bought, for a given year).
`CareerSubOption` / `CompanyCareerSubOption` add finer-grained purchases.
Nearly every business question is scoped by academic year.

### What a purchase grants

What buying something *gives* a company lives in `CareerSubOptionGrant`
(`career_sub_option_grants`): rows of a sub-option, a `type` and a JSON
`config`. The table is deliberately generic -- the meaning of each type, how
long it lasts and which configs are valid are defined in code, in
[`src/lib/grants.ts`](../src/lib/grants.ts), so a new kind of access is a new
entry there, not a migration. Today's types:

| Type | Gives | Lasts |
|---|---|---|
| `cv_book` | CV books; config `{"scope": "sale_year"}` or `{"scope": "books", "bookIds": [...]}` (how an older book is sold) | for good |
| `company_page` | the public `/company/<name>` page (the company must also be `published`) | the year sold |
| `vacancies` | posting on the vacancy platform | the year sold |
| `matching_software` | seeing matched students | the year sold |
| `student_schedules` | student schedules on the dashboard | the year sold |
| `extra_booth` | a second booth on the floorplan | the year sold |

- **Only sub-options carry grants.** A package (`CareerEventOption`) grants
  whatever the sub-options it includes grant. Packages are copied to a new row
  every academic year; sub-options are not, so their grants simply stay.
- **Names are labels.** Access used to be decided by sub-option names ("CV
  Book", "Company Page On Platform", anything with "matching" and
  "software"...), so renaming one switched a feature off. The migration that
  added the table backfilled grants from those names; nothing reads names now.
- **How it is checked.** `shapeCompany()` puts the grant types a company holds
  *this* academic year on `company.grants`, and the synchronous checks in
  `src/lib/utils/company-access.ts` (`hasGrant()`, `hasCompanyPageAccess()`)
  read that, in server and client code alike. `cv_book` lasts for good, so it
  is worked out across every year's sales in `listCVBookAccessForCompany()`.
- An admin sets grants in `/admin/career-options` -> Sub-options ("Purchasing
  this grants access to"). A type in the database that the running code does
  not know is ignored.

## The event itself

`CareerEventPage` — public page content, including `latitude`/`longitude`
(formerly a PostGIS point). It has **no status column of its own**: the page is
public exactly when `CareerEvent.status` is `"published"`. Both rows used to
carry a draft flag and only the page's one gated anything, so the two could
disagree; the event's flag is now the single gate, and the admin page form
writes it through to the event. Its `header_buttons` JSON array picks the
header buttons, plus one entry that is not a header button: `"companies"`
makes the list of attending companies public (the hero's "Explore companies",
`/api/events/companies` and the page payload all check it). It is off by
default and not carried into a new edition, so the list stays hidden until VTK
announces it. `Floorplan` → `Booth` → `Zone`/`ZoneBooth`.
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

  Only the first three may sign in — see [auth.md](auth.md). The ids are also
  exported from [`src/lib/roles.ts`](../src/lib/roles.ts) for UI that needs
  them; the two authorization copies named in auth.md stay separate on purpose.

  `users.profile_link` is the URL a visitor is sent to when they click a
  person's card in the homepage team section. It only applies to the two
  internal roles, so `/admin/users` shows the field for those roles only and
  clears it when the role changes. It reaches `window.open()` unescaped, so
  `src/lib/repos/users.ts` drops anything that is not http(s) on write.
- `Student` — separate table, separate login, separate password column.
  Both password columns are argon2id.
- `CompanyUserRequest` — company reps awaiting admin approval.

## Company-facing products

- `CvBook` / `CvBookScreening` / `CvBookFavourite` — students upload CVs,
  admins screen them, companies request access and favourite candidates.
  A `CvBook` is not a document: it points at a form plus the field names
  holding name, email, study, CV and LinkedIn, and its contents are read live
  from that form's responses (`getCVBookStudentData()`). The rules that are
  easy to miss, all in `src/lib/repos/cv-book.ts`:
  - **One form, many years.** `/forms/cv-book` feeds every year's book. A
    response belongs to the book whose academic year had most recently started
    when it was submitted (the oldest book also keeps anything earlier), and a
    signed-in student's resubmit starts a new response once a new academic
    year has begun (`cvBookResponseWindowStart()`), instead of overwriting last
    year's CV.
  - **Access per year bought, for good.** A company opens a book its
    `cv_book` grants cover -- the year of the sale, or specific books -- for
    good (`listCVBookAccessForCompany()`, see "What a purchase grants"), and
    only while the book is published.
  - **One publish switch, no bulk approval.** `cv_books.active` alone decides
    whether companies see a book ("Publish" / "Unpublish" in admin), and it
    can be flipped both ways. Companies only ever see CVs an admin approved
    one by one: publishing approves nothing, so CVs sent later stay hidden
    until screened. `screening_complete` (the old "Mark ready for companies",
    which bulk-approved every unscreened CV) is no longer read; its column is
    left for a later migration to drop.
  - **CVs are private files.** `files.private` is set on every CV in a book
    (`markCVFilesPrivate()`, after each submission and book change);
    `/api/files` then serves it only to an admin, a company that can see that
    CV, or the student who uploaded it (`src/lib/file-access.ts`), uncached.
  - **Students can opt out.** `students.cv_book_opt_out`, switched on
    `/student/account`, hides them from companies in every book; matched by
    student id, or by email for CVs sent without signing in. Screening still
    lists them as "Withdrawn by student".
  - A `master-degrees` study field stores ids; the book shows master and
    faculty names, and screening offers the masters as study options.
- `Vacancy` + `VacancyType` / `VacancySector` / `VacancySectorLink` /
  `VacancyMaster` / `VacancySectionConfig` — job board. Behind
  `DEV_ENVIRONMENT`, and a company only posts with the `vacancies` grant.
- `MatchingSoftware`, `StudentMatchingResponse*`, `CompanyMatchingResponse*` —
  student↔company matching questionnaire.
- `Form` / `FormVersion` / `FormResponse` — the generic form builder used for
  company intake, with a versioned schema. A field's title (`label`) is
  optional: untitled inputs continue the titled field above them
  ("Representative names" → one input per name), and headers fall back to the
  placeholder (`fieldDisplayLabel()` in `src/lib/form-fields.ts`). For
  signed-in students, `master-degrees` and `study-year` fields start filled in
  from their account (`studyPrefillForFields()`, computed in
  `fetchPublicFormBySlugAction`). `study-year` stores the **English label**,
  not the SSO enum value, so answers read like any other select in the
  responses table, the CSV export and the CV book. `study-programme` is a
  retired field type: the builder no longer offers it, but it still renders
  for forms that already had it.

## Study programmes

`Faculty` → `FacultyMaster` → `Master`, joined to companies via `CompanyMaster`
and to vacancies via `VacancyMaster`.

`masters.study_programme` links a master to a vtk.be study programme (the SSO
enum value from `src/lib/study-options.ts`), set in `/admin/masters`. It is
what lets one question type serve everyone: a student with a vtk.be programme
gets the linked master prefilled in `master-degrees` fields, and anyone whose
programme is theirs to choose ticks masters (or a faculty without masters) on
`/student/account`, stored as `students.study_master_ids` /
`study_faculty_ids` and prefilled the same way (`src/lib/study-choices.ts`,
see [auth.md](auth.md#study-info-who-may-change-what)). These are plain id
lists rather than junctions: a deleted master or faculty just stops matching.
Several masters may share a programme; a single-choice field is then left
empty rather than guessed.

## Files

`File` rows carry metadata; bytes live on disk under `UPLOADS_DIR`, named by the
row's UUID. Served through `src/app/api/files/[fileId]`.

## System logs

`SystemLog` (`system_logs`) is the technical log the IT admins read at
`/admin/system-logs` — see [architecture.md](architecture.md#system-logs). It
has no relations on purpose: `student_id` is a plain integer so a log line
outlives the student it mentions and never blocks deleting one.

## Conventions

- Table names are `@@map`ped to snake_case plurals; Prisma model names are
  PascalCase singular.
- Foreign keys are suffixed `_id`.
- `date_created` / `date_updated` exist on most tables (Directus inheritance).
- Migrations live in `prisma/migrations/`. `00000000000000_init` is the
  baseline captured from the Directus database — never edit it.
