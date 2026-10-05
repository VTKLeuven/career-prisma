import { loadPublicMasters } from "@/lib/masters-data";
import { CompanyInformationForm } from "./company-information-form";

/** The company comes from the settings layout; the master list (cached) from here. */
export default async function CompanyInformationPage() {
  return <CompanyInformationForm masters={await loadPublicMasters()} />;
}
