import { getUserFromCookies } from "@/lib/auth-server";
import { fetchFormResponsesPageAction, fetchFormWithVersionsAction } from "@/app/actions/forms";
import { fetchFacultiesAction } from "@/app/actions/features";
import { loadPublicMasters } from "@/lib/masters-data";
import { normalizeFaculties } from "@/lib/utils/master-degree-options";
import type { FormResponse, FormVersion } from "@/lib/schema";
import { FormResponsesClient } from "./responses-client";

/**
 * Loads the form, its versions and the first page of responses here, in
 * parallel. The client page used to fetch them with server actions after
 * hydrating -- one after another, and the first page twice.
 */
export default async function FormResponsesPage({ params }: { params: Promise<{ formId: string }> }) {
  const user = await getUserFromCookies();
  if (!user?.admin) return <p>NO ACCESS</p>;
  const { formId } = await params;

  const [formWithVersions, page] = await Promise.all([
    fetchFormWithVersionsAction(formId).catch(() => null),
    fetchFormResponsesPageAction({ formId }, { limit: 25, page: 1 }).catch(() => null),
  ]);
  const form = formWithVersions?.form ?? null;
  const versions = (formWithVersions?.versions ?? []) as FormVersion[];

  const hasMasterDegrees = versions.some((v) => v.schema?.fields?.some((f) => f.type === "master-degrees"));
  const [masters, faculties] = hasMasterDegrees
    ? await Promise.all([loadPublicMasters(), fetchFacultiesAction()])
    : [[], []];

  return (
    <FormResponsesClient
      formId={formId}
      initialData={{
        form: form ? { id: form.id, name: form.name, slug: form.slug } : null,
        versions,
        page: {
          responses: (page?.responses ?? []) as FormResponse[],
          total: page?.total ?? 0,
          first: page?.first?.submitted_at ?? null,
          latest: page?.latest?.submitted_at ?? null,
        },
        masters,
        faculties: normalizeFaculties(faculties ?? []) ?? [],
      }}
    />
  );
}
