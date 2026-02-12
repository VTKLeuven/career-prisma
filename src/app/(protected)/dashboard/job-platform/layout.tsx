'use client'

import { ReactNode } from "react"
import { SectionLayout } from "@/components/dashboard/SectionLayout"

export default function JobPlatformLayout({ children }: { children: ReactNode }) {
  return (
    <SectionLayout
      title="Job Platform"
      description="Manage job postings, CV books, and connect with talented students"
      items={[
        { title: "CV Book", url: "/dashboard/job-platform/cv-book" },
        { title: "Matching Software", url: "/dashboard/job-platform/matching-software" },
        { title: "Vacancies", url: "/dashboard/job-platform/vacancies" },
      ]}
    >
      {children}
    </SectionLayout>
  )
}

