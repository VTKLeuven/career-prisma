'use client'

import { ReactNode } from "react"
import { SectionLayout } from "@/components/dashboard/SectionLayout"

export default function OnlineInteractionLayout({ children }: { children: ReactNode }) {
  return (
    <SectionLayout
      title="Online Interaction"
      description="Manage social media posts and email communications with students"
      items={[
        { title: "Social Media Post", url: "/dashboard/online-interaction/social-media-post" },
        { title: "Mailing", url: "/dashboard/online-interaction/mailing" },
      ]}
    >
      {children}
    </SectionLayout>
  )
}

