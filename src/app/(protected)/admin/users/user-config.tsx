"use client";

import type { ResourceConfig, SelectOption } from "@/components/admin/types";
import {
  createUserAction,
  updateUserAction,
  deleteUserAction,
} from "@/app/actions/admin-users";
import type { AdminUserRow } from "@/lib/repos/users";
import { INTERNAL_ROLE_IDS } from "@/lib/roles";
import { Eye, EyeOff, UserRound } from "lucide-react";
import Image from "next/image";
import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const STATUS_OPTIONS: SelectOption[] = [
  { value: "active", label: "Active" },
  { value: "invited", label: "Invited" },
  { value: "archived", label: "Archived" },
];

export function fullName(u: AdminUserRow): string {
  return [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email || u.id;
}

/**
 * How a user is listed and edited -- the User Management page, and the
 * company page's Edit on a representative, use the same form.
 */
export function userResourceConfig(
  roleOptions: SelectOption[],
  companyOptions: SelectOption[]
): ResourceConfig<AdminUserRow> {
  return {
    singular: "User",
    getId: (u) => u.id,
    getLabel: (u) => fullName(u),
    searchKeys: ["first_name", "last_name"],
    defaultSort: { key: "name" },
    columns: [
      {
        key: "avatar",
        label: "Photo",
        sortable: false,
        render: (u) =>
          u.avatar ? (
            <Image
              src={`/api/files/${u.avatar}`}
              alt={fullName(u)}
              width={40}
              height={40}
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
      { key: "role_name", label: "Role", render: (u) => u.role_name || "—", filter: true },
      {
        key: "status",
        label: "Status",
        filter: { options: STATUS_OPTIONS },
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
      { key: "company_name", label: "Company", render: (u) => u.company_name || "—", filter: true },
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
        // Only the internal roles get a card in the homepage team section, so
        // this is the only place the link can do anything. Switching the role
        // away hides the field and clears the stored value.
        name: "profile_link",
        label: "Homepage card link",
        type: "text",
        placeholder: "https://www.linkedin.com/in/...",
        help: "Opened in a new tab when a visitor clicks this person's card on the homepage. Leave empty for no link.",
        visible: (values) => INTERNAL_ROLE_IDS.includes(String(values.role_id ?? "")),
        getEditValue: (u) => u.profile_link ?? "",
      },
      {
        name: "company_id",
        label: "Company",
        type: "select",
        options: companyOptions,
        getEditValue: (u) => u.company_id ?? "",
      },
      {
        // Not a column: updateUserAction / createUserAction take it off the
        // payload and set the hash through repos/credentials. Always starts
        // empty, and empty leaves the stored password alone.
        name: "new_password",
        label: "Set password",
        type: "text",
        section: "Password",
        help: `Leave empty to keep the current password. Setting one makes the account active straight away and mails nothing — pass it on yourself. At least 8 characters.`,
        getEditValue: () => "",
        renderInput: ({ value, onChange }) => (
          <NewPasswordInput value={String(value ?? "")} onChange={onChange} />
        ),
      },
    ],
    actions: {
      create: createUserAction,
      update: updateUserAction,
      remove: deleteUserAction,
    },
  };
}

/**
 * The admin's "Set password" box. Hidden by default, with a toggle to check
 * what was typed. `new-password` stops the browser from filling in the
 * admin's own saved login here -- the form also has an email field, so it
 * looks like a sign-in form -- which would silently become this user's password.
 */
function NewPasswordInput({ value, onChange }: { value: string; onChange: (value: unknown) => void }) {
  const [shown, setShown] = React.useState(false);
  return (
    <div className="relative">
      <Input
        id="field-new_password"
        type={shown ? "text" : "password"}
        autoComplete="new-password"
        spellCheck={false}
        data-1p-ignore
        data-lpignore="true"
        placeholder="Unchanged"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pr-10"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? "Hide password" : "Show password"}
      >
        {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </div>
  );
}
