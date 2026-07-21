"use client";

import { ResourceManager } from "@/components/admin/ResourceManager";
import type { ResourceConfig, SelectOption } from "@/components/admin/types";
import {
  createUserAction,
  updateUserAction,
  deleteUserAction,
} from "@/app/actions/admin-users";
import type { AdminUserRow } from "@/lib/repos/users";
import { UserRound } from "lucide-react";

const STATUS_OPTIONS: SelectOption[] = [
  { value: "active", label: "Active" },
  { value: "invited", label: "Invited" },
  { value: "archived", label: "Archived" },
];

function fullName(u: AdminUserRow): string {
  return [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email || u.id;
}

export default function UsersClient({
  initialUsers,
  roleOptions,
  companyOptions,
}: {
  initialUsers: AdminUserRow[];
  roleOptions: SelectOption[];
  companyOptions: SelectOption[];
}) {
  const config: ResourceConfig<AdminUserRow> = {
    singular: "User",
    getId: (u) => u.id,
    getLabel: (u) => fullName(u),
    searchKeys: ["first_name", "last_name", "email"],
    columns: [
      {
        key: "avatar",
        label: "Photo",
        render: (u) =>
          u.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/files/${u.avatar}`}
              alt={fullName(u)}
              className="h-10 w-10 rounded-full border object-cover"
            />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <UserRound className="h-5 w-5 text-muted-foreground" />
            </span>
          ),
      },
      { key: "name", label: "Name", render: (u) => fullName(u) },
      { key: "email", label: "Email", render: (u) => u.email || "—" },
      { key: "role_name", label: "Role", render: (u) => u.role_name || "—" },
      {
        key: "status",
        label: "Status",
        render: (u) => (
          <span
            className={
              u.status === "archived"
                ? "text-muted-foreground"
                : u.status === "invited"
                  ? "text-amber-600"
                  : "text-emerald-600"
            }
          >
            {u.status}
          </span>
        ),
      },
      { key: "company_name", label: "Company", render: (u) => u.company_name || "—" },
    ],
    fields: [
      { name: "avatar", label: "Photo", type: "image" },
      { name: "first_name", label: "First name", type: "text" },
      { name: "last_name", label: "Last name", type: "text" },
      { name: "email", label: "Email", type: "text", required: true },
      { name: "title", label: "Job title", type: "text" },
      { name: "tel", label: "Phone", type: "text" },
      {
        name: "role_id",
        label: "Role",
        type: "select",
        options: roleOptions,
        getEditValue: (u) => u.role_id ?? "",
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        options: STATUS_OPTIONS,
        defaultValue: "invited",
        getEditValue: (u) => u.status ?? "",
      },
      {
        name: "company_id",
        label: "Company",
        type: "select",
        options: companyOptions,
        getEditValue: (u) => u.company_id ?? "",
      },
    ],
    actions: {
      create: createUserAction,
      update: updateUserAction,
      remove: deleteUserAction,
    },
  };

  return <ResourceManager config={config} initialRows={initialUsers} />;
}
