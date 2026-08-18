import { redirect } from "next/navigation";
import { isDevEnvironment } from "@/lib/dev-environment";

/**
 * The public floorplan is hidden outside the dev environment.
 *
 * `page.tsx` in this segment is a client component and cannot read the flag
 * itself, so the gate lives here: this layout runs on the server for every
 * request that hits `/event/<name>/<subPage>`, which is what a direct link to
 * the floorplan is. The event page also hides its Floorplan buttons, so in
 * practice this only catches bookmarks, shared links and search results.
 *
 * Only the floorplan sub-page is affected — matching-software and the company
 * guide keep working.
 */
export default async function EventSubPageLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ subPage: string }>;
}) {
  const { subPage } = await params;

  if (subPage === "floorplan" && !isDevEnvironment()) {
    redirect("/");
  }

  return <>{children}</>;
}
