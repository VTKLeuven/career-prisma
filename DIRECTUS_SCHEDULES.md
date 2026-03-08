# Directus Setup for Student Schedules

The **Student Schedules** feature allows companies with the "Student Schedules" sub-option to download PDF schedules per study program (master). Schedules are filtered by the company's interested categories (`company.category`).

## schedule collection

Create a collection `schedule` (or `Schedule`) with the following fields:

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key (auto) |
| event | M2O | Relation to `career_event` |
| master | M2O | Relation to `master` |
| pdf | File | Directus file (PDF) |

**Directus setup:**
1. Create collection `schedule`
2. Add field `event` – Many-to-One → `career_event`
3. Add field `master` – Many-to-One → `master`
4. Add field `pdf` – File (or Interface: File)

## career_sub_option: "Student Schedules"

Create a sub-option in `career_sub_option` with name **"Student Schedules"** (exact match, case-insensitive). Companies that have this sub-option (in their options or suboptions) can access the schedules page.

Link this sub-option to the relevant career event options so companies can select it when registering.

## Admin: Add Schedules

1. In Admin → Events, open an event card
2. Click "Add Schedules" or "Edit Schedules" (links to Admin → Schedules)
3. In Admin → Schedules, select the event and add schedule entries (master + PDF upload)
4. Companies with "Student Schedules" sub-option will see schedules filtered by their `company.category` (masters they are interested in)

## Company Dashboard: Student Schedules

1. In the company dashboard (Manage your events), each event card shows a "Student Schedules" button when:
   - The company has the "Student Schedules" sub-option (in options or suboptions)
   - The event has at least one schedule in the `schedule` collection
2. Clicking "Student Schedules" opens the protected schedules page at `/dashboard/schedules/event/[eventId]`
3. The schedules page shows PDFs for masters in the company's `company.category` only

## Flow

1. Admin adds schedule items via Admin → Schedules (or directly in Directus)
2. Company rep logs in and goes to Dashboard → Manage your events
3. For each event with schedules, the "Student Schedules" button appears (if company has the sub-option)
4. Clicking it shows PDFs for masters in the company's `company.category` only
