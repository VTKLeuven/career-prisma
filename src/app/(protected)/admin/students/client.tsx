"use client";

import { ResourceManager } from "@/components/admin/ResourceManager";
import type { ResourceConfig } from "@/components/admin/types";
import { updateStudentAction, deleteStudentAction } from "@/app/actions/students";
import type { Student } from "@/lib/schema";
import { STUDY_PROGRAMMES, STUDY_YEARS, labelForProgramme, labelForYear } from "@/lib/study-options";

const PROGRAMME_OPTIONS = STUDY_PROGRAMMES.map((p) => ({ value: p.value, label: p.labelEn }));
const YEAR_OPTIONS = STUDY_YEARS.map((y) => ({ value: y.value, label: y.labelEn }));

/** A student with what they study, as labels (computed on the page). */
type StudentRow = Student & { study: string[] };

function fullName(s: Student): string {
  return (
    [s.first_name, s.last_name].filter(Boolean).join(" ") ||
    s.full_name ||
    s.email ||
    String(s.id)
  );
}

export default function StudentsClient({ initialStudents }: { initialStudents: StudentRow[] }) {
  const config: ResourceConfig<StudentRow> = {
    singular: "Student",
    hideCreate: true,
    getId: (s) => String(s.id),
    getLabel: (s) => fullName(s),
    searchKeys: ["first_name", "last_name", "username"],
    defaultSort: { key: "name" },
    columns: [
      // Sorts on the name as shown, so A-Z runs by first name.
      { key: "name", label: "Name", render: (s) => fullName(s) },
      {
        key: "student_number",
        label: "R-number",
        className: "font-mono text-xs text-muted-foreground",
        // Older accounts kept the r-number only as their username.
        value: (s) => s.student_number || (/^r\d{7}$/i.test(s.username) ? s.username : null),
      },
      { key: "email", label: "Email" },
      { key: "university", label: "University", filter: true },
      {
        key: "study",
        label: "Study",
        value: (s) => s.study,
        render: (s) => s.study.join(", ") || "—",
        filter: true,
      },
      {
        // vtk.be's own vocabulary; what the Study column is derived from for SSO students.
        key: "study_programmes",
        label: "vtk.be programme",
        value: (s) => s.study_programmes,
        render: (s) => s.study_programmes.map(labelForProgramme).join(", ") || "—",
        filter: { options: PROGRAMME_OPTIONS },
        defaultHidden: true,
      },
      {
        key: "study_years",
        label: "Year",
        value: (s) => s.study_years,
        render: (s) => s.study_years.map(labelForYear).join(", ") || "—",
        filter: { options: YEAR_OPTIONS },
      },
      {
        key: "verified",
        label: "Verified",
        value: (s) => Boolean(s.verified),
        render: (s) =>
          s.verified ? (
            <span className="text-emerald-600">Yes</span>
          ) : (
            <span className="text-muted-foreground">No</span>
          ),
        filter: true,
      },
      {
        key: "is_shifter",
        label: "Shifter",
        value: (s) => Boolean(s.is_shifter),
        render: (s) => (s.is_shifter ? "Yes" : "—"),
        filter: true,
      },
      {
        key: "date_created",
        label: "Joined",
        value: (s) => (s.date_created ? new Date(s.date_created) : null),
        render: (s) => (s.date_created ? new Date(s.date_created).toLocaleDateString("en-GB") : "—"),
        defaultHidden: true,
      },
    ],
    fields: [
      { name: "first_name", label: "First name", type: "text" },
      { name: "last_name", label: "Last name", type: "text" },
      { name: "email", label: "Email", type: "text", required: true },
      { name: "username", label: "Username", type: "text", required: true },
      { name: "university", label: "University", type: "text" },
      { name: "verified", label: "Verified", type: "boolean" },
      { name: "is_shifter", label: "Shifter", type: "boolean" },
    ],
    actions: {
      update: updateStudentAction,
      remove: deleteStudentAction,
    },
  };

  return <ResourceManager config={config} initialRows={initialStudents} />;
}
