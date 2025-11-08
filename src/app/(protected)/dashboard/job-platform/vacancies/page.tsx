'use client'

import { ComingSoon } from "@/components/dashboard/ComingSoon"
import { Briefcase } from "lucide-react"

export default function DashboardVacanciesPage() {
  return (
    <ComingSoon
      title="Vacancies"
      description="Our vacancies platform is currently under development. Soon you'll be able to post job openings, manage applications, and find the perfect candidates for your company from our talented pool of engineering students."
      icon={<Briefcase className="h-16 w-16 text-vtk-blue" />}
    />
  )
}

