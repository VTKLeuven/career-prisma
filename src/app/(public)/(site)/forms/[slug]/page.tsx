import { cache } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { fetchPublicFormBySlugAction } from "@/app/actions/forms";
import { PublicFormClient, type PublicForm } from "./form-client";

/**
 * /forms/<slug>: a public form (event registrations, CV uploads). Loaded on
 * the server with the signed-in student's existing answers and prefill, so
 * the form is in the first response -- it used to show "Loading form..." and
 * then, for login-only forms, "Redirecting to login...".
 */
type Params = Promise<{ slug: string }>;

// generateMetadata and the page share one load per request.
const loadForm = cache((slug: string) => fetchPublicFormBySlugAction(slug));

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const form = await loadForm(slug);
  return form ? { title: form.name } : {};
}

export default async function PublicFormPage({ params }: { params: Params }) {
  const { slug } = await params;
  const form = (await loadForm(slug)) as PublicForm | null;

  if (form?.requiresLogin && !form.isAuthenticated) {
    redirect(`/student-login?redirectTo=${encodeURIComponent(`/forms/${slug}`)}`);
  }

  // Keyed so navigating to another form starts with that form's answers.
  return <PublicFormClient key={slug} initialForm={form} />;
}
