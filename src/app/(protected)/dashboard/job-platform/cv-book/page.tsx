'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ComingSoon } from "@/components/dashboard/ComingSoon"
import { IconFileCv } from "@tabler/icons-react"
import { useUser } from "@/providers/UserProvider"
import { fetchCompanyByIdAction } from "@/app/actions/companies"
import { getCompanySubOptionAnyStatus } from "@/lib/utils/company-access"
import { getCVBookSubOption } from "@/lib/repos/option"
import type { Company } from "@/lib/schema"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function CVBookPage() {
  const { user } = useUser()
  const router = useRouter()
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const [isActive, setIsActive] = useState<boolean | null>(null)

  useEffect(() => {
    async function loadCompany() {
      if (!user?.company?.id) {
        setLoading(false)
        return
      }

      try {
        // First check if CV Book is active
        const cvBookSubOption = await getCVBookSubOption()
        console.log("[CVBookPage] CV Book sub-option from Directus:", cvBookSubOption)
        const active = cvBookSubOption?.active ?? false
        setIsActive(active)
        console.log("[CVBookPage] CV Book active status:", active)

        // If not active, always show coming soon page
        if (!active) {
          console.log("[CVBookPage] CV Book not active, showing coming soon")
          setLoading(false)
          return
        }

        // If active, check if company has the sub-option (regardless of active status in company options)
        const fetchedCompany = await fetchCompanyByIdAction(user.company.id)
        console.log("[CVBookPage] Fetched company:", fetchedCompany)
        console.log("[CVBookPage] Company options:", fetchedCompany?.options)
        if (fetchedCompany?.options && Array.isArray(fetchedCompany.options)) {
          fetchedCompany.options.forEach((opt: any, idx: number) => {
            console.log(`[CVBookPage] Option ${idx}:`, opt)
            if (opt && typeof opt === 'object') {
              const option = 'career_event_option_id' in opt ? opt.career_event_option_id : opt
              console.log(`[CVBookPage] Option ${idx} - career_event_option_id:`, option)
              if (option?.sub_options) {
                console.log(`[CVBookPage] Option ${idx} - sub_options:`, option.sub_options)
              }
            }
          })
        }
        setCompany(fetchedCompany ?? null)
        // Check if company has the CV Book sub-option (without checking active status)
        const companySubOption = getCompanySubOptionAnyStatus(fetchedCompany ?? null, "CV Book")
        console.log("[CVBookPage] Company CV Book sub-option:", companySubOption)
        const access = companySubOption !== null
        setHasAccess(access)
        console.log("[CVBookPage] Company has access:", access)
        
        // Redirect to request page if no access
        if (!access) {
          console.log("[CVBookPage] No access, redirecting to request page")
          router.replace("/dashboard/job-platform/cv-book/request-access")
        }
      } catch (error) {
        console.error("[CVBookPage] Error fetching:", error)
        setCompany(null)
        setHasAccess(false)
        setIsActive(false)
      } finally {
        setLoading(false)
      }
    }

    loadCompany()
  }, [user?.company?.id, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // If CV Book is not active, always show coming soon page
  if (isActive === false) {
    return (
      <ComingSoon
        title="CV Book"
        description="Our CV book platform is currently under development. Soon you'll be able to browse student CVs, search for candidates by skills and experience, and connect with talented students from the engineering faculty."
        icon={<IconFileCv className="h-16 w-16 text-vtk-blue" />}
      />
    )
  }

  // If company doesn't have CV Book access, redirect will happen
  // This is just a fallback
  if (!hasAccess) {
    return null
  }

  // Company has access and CV Book is active - show access page
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-vtk-blue/10 p-6">
              <IconFileCv className="h-16 w-16 text-vtk-blue" />
            </div>
          </div>
          <CardTitle className="text-3xl sm:text-4xl font-bold mb-2">
            CV Book
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-6">
            <p className="text-center text-lg text-foreground leading-relaxed">
              COMPANY HAS ACCESS
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

