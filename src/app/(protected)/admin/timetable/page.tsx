import { getUserFromCookies } from "@/lib/auth-server";
import { redirect } from "next/navigation";

export default async function AdminTimetablePage() {
  const user = await getUserFromCookies();
  if (!user?.admin) return <p>NO ACCESS</p>;

  redirect("/admin/event-pages");
}
