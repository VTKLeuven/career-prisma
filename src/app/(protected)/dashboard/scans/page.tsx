import { redirect } from "next/navigation";

// Redirected on the server: the client-side router.replace() this used to be
// first loaded and hydrated an empty page.
export default function MyScansPage() {
  redirect("/dashboard/scans/all");
}
