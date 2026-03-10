import { getUserFromCookies } from "@/lib/auth-server";
import CheckinsClient from "./client";

export default async function AdminCheckinsPage() {
  const user = await getUserFromCookies();
  if (!user?.admin) return <p>NO ACCESS</p>;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Event Check-ins</h1>
      </div>
      <CheckinsClient />
    </div>
  );
}
