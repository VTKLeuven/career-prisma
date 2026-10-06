import { fetchCompanyByIdAction } from "@/app/actions/companies";
import { getUserFromCookies } from "@/lib/auth-server";
import { SettingsCompanyProvider } from "./settings-company";
import { SettingsShell } from "./settings-shell";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  // The (protected) layout already turned away visitors who are not signed in.
  const user = await getUserFromCookies();
  const company = user?.company?.id ? await fetchCompanyByIdAction(user.company.id).catch(() => null) : null;

  return (
    <SettingsCompanyProvider initialCompany={company ?? null}>
      <SettingsShell>{children}</SettingsShell>
    </SettingsCompanyProvider>
  );
}
