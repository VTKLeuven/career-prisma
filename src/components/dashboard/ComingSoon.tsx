'use client'

import { Clock, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ComingSoonProps {
  title: string
  description: string
  icon?: React.ReactNode
  /** Where the back button points. Public pages are not behind the dashboard. */
  backHref?: string
  backLabel?: string
}

export function ComingSoon({
  title,
  description,
  icon,
  backHref = "/dashboard",
  backLabel = "Back to Dashboard",
}: ComingSoonProps) {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-vtk-blue/10 p-6">
              {icon || <Clock className="h-16 w-16 text-vtk-blue" />}
            </div>
          </div>
          <CardTitle className="text-3xl sm:text-4xl font-bold mb-2">
            {title}
          </CardTitle>
          <p className="text-xl sm:text-2xl text-muted-foreground mb-2">
            Coming Soon
          </p>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Clock className="h-5 w-5" />
            <span>We're working on something amazing</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-6">
            <p className="text-center text-lg text-foreground leading-relaxed">
              {description}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              asChild
              variant="outline"
              className="rounded-full border-vtk-blue text-vtk-blue hover:bg-vtk-blue/10 px-6 py-3"
            >
              <Link href={backHref}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {backLabel}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

