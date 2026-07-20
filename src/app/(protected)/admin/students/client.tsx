"use client";

import { ResourceManager } from "@/components/admin/ResourceManager";
import type { ResourceConfig } from "@/components/admin/types";
import { updateStudentAction, deleteStudentAction } from "@/app/actions/students";
import type { Student } from "@/lib/schema";

function fullName(s: Student): string {
  return (
    [s.first_name, s.last_name].filter(Boolean).join(" ") ||
    s.full_name ||
    s.email ||
    String(s.id)
  );
}

export default function StudentsClient({ initialStudents }: { initialStudents: Student[] }) {
  const config: ResourceConfig<Student> = {
    singular: "Student",
    hideCreate: true,
    getId: (s) => String(s.id),
    getLabel: (s) => fullName(s),
    searchKeys: ["first_name", "last_name", "email", "username"],
    columns: [
      { key: "name", label: "Name", render: (s) => fullName(s) },
      { key: "email", label: "Email", render: (s) => s.email || "—" },
      { key: "university", label: "University", render: (s) => s.university || "—" },
      {
        key: "verified",
        label: "Verified",
        render: (s) =>
          s.verified ? (
            <span className="text-emerald-600">Yes</span>
          ) : (
            <span className="text-muted-foreground">No</span>
          ),
      },
      {
        key: "is_shifter",
        label: "Shifter",
        render: (s) => (s.is_shifter ? "Yes" : "—"),
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
