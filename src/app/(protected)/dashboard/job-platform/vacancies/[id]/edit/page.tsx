import { fetchVacancyByIdAction } from "@/app/actions/vacancies";
import { canUseCompanyVacancyPages } from "../../access";
import { loadVacancyFormOptions } from "../../form-options";
import { VacancyEditor } from "../../vacancy-editor";

export default async function EditVacancyPage({ params }: { params: Promise<{ id: string }> }) {
  // Without the vacancy grant the layout explains why; load nothing then.
  if (!(await canUseCompanyVacancyPages())) return null;
  const { id } = await params;

  const [vacancy, options] = await Promise.all([
    // Throws for another company's vacancy; that reads as not found here.
    fetchVacancyByIdAction(id).catch(() => null),
    loadVacancyFormOptions(),
  ]);

  if (!vacancy) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Vacancy not found.</p>
      </div>
    );
  }

  return <VacancyEditor vacancy={vacancy} {...options} />;
}
