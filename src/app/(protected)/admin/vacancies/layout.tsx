import { redirect } from "next/navigation";
import { getUserFromCookies } from "@/lib/auth-server";

/**
 * Vacancy configuration -- types, sectors, text sections, and every company's
 * vacancies. Until BR-24 this layout showed "coming soon" outside
 * DEV_ENVIRONMENT; it went live with the company side, since a company cannot
 * fill in a vacancy before an admin has set up these pick lists.
 *
 * The page is a client component, so it is authorized here, the same way as
 * admin/layout.tsx (no middleware does it). Every action it calls in
 * app/actions/vacancies.ts checks for an admin again.
 */
export default async function AdminVacanciesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUserFromCookies();
  if (!user) redirect("/login");
  if (!user.admin) redirect("/dashboard");
  return <>{children}</>;
}
