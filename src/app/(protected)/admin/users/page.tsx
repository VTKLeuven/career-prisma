import { getUserFromCookies } from "@/lib/auth-server";
import { listUsers, listRoles } from "@/lib/repos/users";
import { listCompaniesBasic } from "@/lib/repos/company";
import UsersClient from "./client";
import { PageHeader } from "@/components/admin/PageHeader";

export default async function AdminUsersPage() {
  const user = await getUserFromCookies();
  if (!user?.admin) return <p>NO ACCESS</p>;

  const [users, roles, companies] = await Promise.all([
    listUsers(),
    listRoles(),
    listCompaniesBasic(),
  ]);

  const roleOptions = roles.map((r) => ({ value: r.id, label: r.name }));
  const companyOptions = companies.map((c) => ({ value: c.id, label: c.name ?? "(unnamed)" }));

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader title="User Management" description="Manage platform users — admins, salespeople and company representatives." />
      <UsersClient
        initialUsers={users}
        roleOptions={roleOptions}
        companyOptions={companyOptions}
      />
    </div>
  );
}
