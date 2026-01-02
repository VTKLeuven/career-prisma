"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { GraduationCap, Building2 } from "lucide-react"

interface LoginSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LoginSelectionDialog({ open, onOpenChange }: LoginSelectionDialogProps) {
  const router = useRouter()

  const handleStudentLogin = () => {
    // Redirect to student login page
    onOpenChange(false)
    router.push("/student-login")
  }

  const handleCompanyLogin = () => {
    // Redirect to company login page
    onOpenChange(false)
    router.push("/login")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose Login Type</DialogTitle>
          <DialogDescription>
            Select whether you want to login as a student or as a company representative.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-4 py-4 px-4 justify-center">
          <Button
            variant="outline"
            className="h-auto flex-col items-center gap-4 p-8 hover:bg-vtk-light/40 min-w-[180px]"
            onClick={handleStudentLogin}
          >
            <GraduationCap className="h-10 w-10 text-vtk-blue" />
            <div className="font-semibold text-lg">Student Login</div>
          </Button>
          <Button
            variant="outline"
            className="h-auto flex-col items-center gap-4 p-8 hover:bg-vtk-yellow/10 border-vtk-yellow min-w-[180px]"
            onClick={handleCompanyLogin}
          >
            <Building2 className="h-10 w-10 text-vtk-blue" />
            <div className="font-semibold text-lg">Company Login</div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

