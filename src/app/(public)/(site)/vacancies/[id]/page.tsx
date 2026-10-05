import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  fetchPublicVacancyByIdAction,
  fetchVacancySectionConfigsAction,
} from "@/app/actions/vacancies";
import type { Company, Vacancy } from "@/lib/schema";
import { VacancyDetailClient } from "./vacancy-client";

/**
 * /vacancies/<id>: one published vacancy, rendered on the server -- it used
 * to fetch itself from the browser behind a skeleton, and had no title.
 */
type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const vacancy = (await fetchPublicVacancyByIdAction(id)) as Vacancy | null;
  if (!vacancy) return {};
  const company = typeof vacancy.company === "object" ? (vacancy.company as Company) : null;
  return { title: company?.name ? `${vacancy.title} · ${company.name}` : vacancy.title };
}

export default async function VacancyDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const [vacancy, sectionConfigs] = await Promise.all([
    fetchPublicVacancyByIdAction(id),
    fetchVacancySectionConfigsAction(),
  ]);
  if (!vacancy) notFound();
  return <VacancyDetailClient vacancy={vacancy as Vacancy} sectionConfigs={sectionConfigs ?? []} />;
}
