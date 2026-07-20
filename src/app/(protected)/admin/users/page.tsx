import { getUserFromCookies } from "@/lib/auth-server";
import { listUsers, listRoles } from "@/lib/repos/users";
import { listCompaniesBasic } from "@/lib/repos/company";
import UsersClient from "./client";

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
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">
          Manage platform users — admins, salespeople and company representatives.
        </p>
      </div>
      <UsersClient
        initialUsers={users}
        roleOptions={roleOptions}
        companyOptions={companyOptions}
      />
    </div>
  );
}
