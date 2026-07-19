import { redirect } from "next/navigation";
import { getUserFromCookies } from "@/lib/auth-server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUserFromCookies();
  if (!user) redirect("/login");
  if (!user.admin) redirect("/dashboard");
  return children;
}
