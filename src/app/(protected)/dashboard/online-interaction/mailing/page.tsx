'use client'

import { ComingSoon } from "@/components/dashboard/ComingSoon"
import { Mail } from "lucide-react"

export default function MailingPage() {
  return (
    <ComingSoon
      title="Mailing"
      description="Our mailing platform is currently under development. Soon you'll be able to send targeted emails to students."
      icon={<Mail className="h-16 w-16 text-vtk-blue" />}
    />
  )
}

