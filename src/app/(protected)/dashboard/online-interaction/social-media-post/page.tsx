'use client'

import { ComingSoon } from "@/components/dashboard/ComingSoon"
import { IconBrandInstagram } from "@tabler/icons-react"

export default function SocialMediaPostPage() {
  return (
    <ComingSoon
      title="Social Media Post"
      description="Our social media post management platform is currently under development. Soon you'll be able to schedule, and manage social media posts to promote your company and events."
      icon={<IconBrandInstagram className="h-16 w-16 text-vtk-blue" />}
    />
  )
}

