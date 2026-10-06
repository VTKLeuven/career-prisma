"use client";

import { ResourceManager } from "@/components/admin/ResourceManager";
import type { SelectOption } from "@/components/admin/types";
import type { AdminUserRow } from "@/lib/repos/users";
import { userResourceConfig } from "./user-config";

export default function UsersClient({
  initialUsers,
  roleOptions,
  companyOptions,
}: {
  initialUsers: AdminUserRow[];
  roleOptions: SelectOption[];
  companyOptions: SelectOption[];
}) {
  return <ResourceManager config={userResourceConfig(roleOptions, companyOptions)} initialRows={initialUsers} />;
}
