'use client'

import { ComingSoon } from "@/components/dashboard/ComingSoon"
import { IconFileCv } from "@tabler/icons-react"

export default function CVBookPage() {
  return (
    <ComingSoon
      title="CV Book"
      description="Our CV book platform is currently under development. Soon you'll be able to browse student CVs, search for candidates by skills and experience, and connect with talented students from the engineering faculty."
      icon={<IconFileCv className="h-16 w-16 text-vtk-blue" />}
    />
  )
}

