# Directus → Prisma migration

## Status

The application migration is complete as of 2026-07-19.

- All application data access uses Prisma.
- Authentication uses signed, expiring application cookies and PostgreSQL.
- User and student passwords remain argon2id hashes.
- Upload metadata is stored in PostgreSQL and file bytes are served from local
  disk through `/api/files/:id`.
- `@directus/sdk`, the Directus client modules, runtime `DIRECTUS_*` variables,
  raw Directus HTTP requests, and hardcoded Directus asset URLs are gone.
- The production build, Prisma schema, Compose config, shell loader, and all
  migrations have been validated.

Directus is no longer a runtime dependency. The only remaining work is the
operational cutover at the end of this document.

## Database migration

The source export contains 92 Directus tables. The transform keeps the
application data in 56 Prisma models and drops CMS infrastructure, dead test
tables, and unrelated collections.

Use the loader on a fresh target database:

```bash
./scripts/load-directus-export.sh directus-export-20260719-163031.tar.gz
```

The script:

1. restores the dump in a temporary PostGIS container;
2. runs `prisma/migrate-from-directus.sql`;
3. dumps the now PostGIS-free result into the target PostgreSQL database;
4. marks the baseline migration as applied;
5. deploys all follow-up Prisma migrations.

It drops and recreates the database named by `DATABASE_URL`.

The temporary PostGIS step is required because the old dump contains a
`geometry(Point,4326)` column. The transform converts that column to plain
`latitude` and `longitude` values, after which the application runs on stock
PostgreSQL.

## Authentication

There is no Directus session table. `src/lib/auth-session.ts` creates
HMAC-SHA256 signed cookies:

- `career_session` for company representatives and administrators;
- `student_session` for students.

The cookie contains only account ID, account kind, and expiry. Each request
loads the current account, role, status, and company from PostgreSQL, so
archiving an account takes effect immediately.

Configure a strong `AUTH_SECRET` or `NEXTAUTH_SECRET`. The cookies are
HTTP-only, same-site `lax`, and secure in production.

Password reset and invitation tokens are random bearer tokens. Only SHA-256
hashes are stored. Invitations expire after seven days; password reset tokens
expire after one hour. Password changes and student verification always write
argon2id hashes.

NextAuth remains installed for the KU Leuven OAuth flow. It is separate from
the company-representative credential session.

## File storage

`src/lib/file-storage.ts` stores:

- file metadata in the `files` table;
- bytes under `UPLOADS_DIR`;
- UUID filenames unchanged from the old Directus upload directory.

Local development defaults to `./directus-uploads`. Compose mounts that
directory into the application container and sets
`UPLOADS_DIR=/app/directus-uploads`.

Sync the exported files before starting the application:

```bash
rsync -avz <directus-host>:/vtk/directus-postgis/uploads/ ./directus-uploads/
```

The 2026-07-19 export was checked: all 2,236 manifest files are present
(approximately 1.6 GB). The extra `*__<hash>.avif` files are old thumbnail
cache entries and are not referenced by the `files` table.

New uploads are written atomically: a temporary file and metadata row are
created first, then the file is renamed to its final UUID. Failed writes clean
up both sides.

The local file service does not implement image transformations. Existing
width/height/quality arguments are retained at component boundaries but are
ignored; browsers receive the original immutable asset.

## Legacy shape boundary

Most page and component code still expects many-to-many relations in the
junction-wrapped shape returned by Directus:

```ts
[{ company_id: company }]
```

`src/lib/repos/_shape.ts` deliberately maps Prisma results back into those
shapes. This confines compatibility to the repository boundary rather than
forcing a high-risk rewrite across consumers. It is compatibility data
shaping, not a Directus dependency.

## Former Directus Flows

The exported active Flows and operations were inspected.

- `creating_company_user` created an invited user for a newly added
  `Company_users` row and rejected duplicate email addresses. The current
  approval/create-representative flow creates the invited Prisma user directly,
  links it to `company_id`, sends the signed invitation, and rejects duplicate
  email addresses.
- `deleting_company_user` archived the linked user and changed its email.
  `deleteUser` now performs that behavior directly and also safely reassigns
  file ownership.
- `WANNES TEST` was an `auth.create` filter with no operation and therefore had
  no behavior to port.

The dropped `Company_users` collection is no longer needed.

## Important migration traps

These were found by differential checks against raw SQL rather than by
type-checking.

### JSON filters

Several old JSON columns were actually `json`, not `jsonb`. Prisma generated
`jsonb` operators that returned zero rows without an error. The transform
converts application JSON columns to `jsonb`. New JSON columns must also use
`jsonb`.

### Merged `OR` filters

Spreading two objects that each contain `OR` into one `where` object silently
keeps only the second `OR`. Combine the clauses explicitly:

```ts
where: { AND: [{ OR: first }, { OR: second }] }
```

### Orphaned junction rows

Directus used `ON DELETE SET NULL` and often unlinked relations without
deleting junction rows. In the matching junction, 106,996 of 116,037 rows were
orphans. The transform removes orphan rows before rebuilding foreign keys.

### Delete order

The migrated schema intentionally does not rely on broad cascades. Delete
junction/dependent rows before parents. `deleteFloorplan` follows that order.

### Attendant scan company IDs

The old `attendant_scans.company_id` pointed to the obsolete integer
`Companies` table and every migrated value was null. It is now a nullable UUID
foreign key to the canonical `companies` table.

### Row-level policies

Directus policies are gone. Their application-visible rules were moved into
queries and route authorization. Administrative mutation routes check the
current application user; public queries explicitly enforce published/active
conditions where the old public role did.

## Validation performed

The completed tree passes:

```bash
npx prisma validate
npx prisma generate
npx tsc --noEmit
npm run build
DOCKER_BUILDKIT=0 docker build --target builder -t career-prisma-migration-check .
POSTGRES_PASSWORD=validation-only docker compose config --quiet
bash -n scripts/load-directus-export.sh
```

The baseline and all follow-up migration SQL files were also applied in order
to an isolated temporary PostgreSQL database. The result contained 56 public
tables and both password-reset timestamp columns; the temporary database was
then dropped.

The configured host `DATABASE_URL` did not authenticate to the currently
running local database, so `prisma migrate status` was not run against that
existing instance.

## Cutover checklist

1. Stop writes to the old Directus instance.
2. Take a final database export and final upload-directory sync.
3. Run `scripts/load-directus-export.sh` against the production target.
4. Confirm the row counts printed by the loader and verify all 2,236 referenced
   upload UUIDs exist on disk.
5. Set `AUTH_SECRET`/`NEXTAUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, SMTP variables,
   and `UPLOADS_DIR`.
6. Ensure the mounted uploads directory is writable by UID 1001 and included
   in backups.
7. Deploy and smoke-test representative login, student login, invitation,
   password reset, public forms/uploads, CV access, floorplans, signage, and
   representative approval/archive.
8. Rotate the database password and the old Directus `SECRET`; both were
   exposed during migration work.
9. Decommission Directus only after the production smoke test and backup
   verification.
