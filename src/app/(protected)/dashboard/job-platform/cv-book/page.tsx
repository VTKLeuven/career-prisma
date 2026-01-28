'use client'

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ComingSoon } from "@/components/dashboard/ComingSoon"
import { IconFileCv, IconMail, IconUser } from "@tabler/icons-react"
import { CVPreview } from "@/components/cv-preview"
import { CVDocumentViewer } from "@/components/cv-document-viewer"
import { useUser } from "@/providers/UserProvider"
import { fetchCompanyByIdAction } from "@/app/actions/companies"
import { getCompanySubOptionAnyStatus } from "@/lib/utils/company-access"
import {
  fetchActiveCVBooksAction,
  fetchCVBookByIdAction,
  fetchCVBookByYearAction,
  fetchCVBookStudentDataAction,
  fetchCVBooksAction,
} from "@/app/actions/cv-book"
import type { Company, CVBook, AcademicYear } from "@/lib/schema"
import type { StudentCVGroup, StudentCVData } from "@/lib/repos/cv-book"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export default function CVBookPage() {
  const { user } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const cvBookIdParam = searchParams.get("cvBookId")
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const [activeCVBooks, setActiveCVBooks] = useState<CVBook[]>([])
  const [selectedYearId, setSelectedYearId] = useState<string>("")
  const [selectedCVBook, setSelectedCVBook] = useState<CVBook | null>(null)
  const [studentGroups, setStudentGroups] = useState<StudentCVGroup[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<StudentCVData | null>(null)
  const [validatedCVs, setValidatedCVs] = useState<Map<string, boolean>>(new Map())
  const [viewMode, setViewMode] = useState<"grid" | "detail">("grid")

  // Flatten students in the same order as the overview (study group order, then student order within each group)
  const flatStudents = useMemo(() => {
    return studentGroups.flatMap((g) => g.students)
  }, [studentGroups])

  const selectedStudentIndex = useMemo(() => {
    if (!selectedStudent) return -1
    return flatStudents.findIndex((s) => s.id === selectedStudent.id)
  }, [flatStudents, selectedStudent])

  const hasPrevStudent = selectedStudentIndex > 0
  const hasNextStudent = selectedStudentIndex >= 0 && selectedStudentIndex < flatStudents.length - 1

  useEffect(() => {
    async function loadData() {
      // Admins can view CV books without a company context
      if (!user?.admin && !user?.company?.id) {
        setLoading(false)
        return
      }

      try {
        // Admin: allow viewing inactive books too
        const books = user?.admin ? await fetchCVBooksAction() : await fetchActiveCVBooksAction()
        setActiveCVBooks(books)

        // If no books at all, show coming soon
        if (books.length === 0) {
          setLoading(false)
          return
        }

        // If we were deep-linked to a CV book (admin "view" action), preselect its year
        if (user?.admin && cvBookIdParam && !selectedYearId) {
          const linkedBook = await fetchCVBookByIdAction(cvBookIdParam)
          if (linkedBook) {
            const yearId = typeof linkedBook.year === "object" ? linkedBook.year.id : linkedBook.year
            setSelectedYearId(yearId)
            setSelectedCVBook(linkedBook)
          }
        }

        // Set default to most recent year
        if (!selectedYearId) {
          const mostRecentBook = books[0]
          const yearId = typeof mostRecentBook.year === "object" ? mostRecentBook.year.id : mostRecentBook.year
          setSelectedYearId(yearId)
        }

        // Non-admin users still need access via sub-option
        if (!user?.admin && user?.company?.id) {
          const fetchedCompany = await fetchCompanyByIdAction(user.company.id)
          setCompany(fetchedCompany ?? null)
          const companySubOption = getCompanySubOptionAnyStatus(fetchedCompany ?? null, "CV Book")
          const access = companySubOption !== null
          setHasAccess(access)
          if (!access) {
            router.replace("/dashboard/job-platform/cv-book/request-access")
          }
        } else {
          setHasAccess(true)
        }
      } catch (error) {
        console.error("[CVBookPage] Error fetching:", error)
        setCompany(null)
        setHasAccess(false)
        setActiveCVBooks([])
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user?.company?.id, user?.admin, router, cvBookIdParam, selectedYearId])

  // Load CV Book and student data when year changes
  useEffect(() => {
    async function loadCVBookData() {
      if (!selectedYearId) {
        setSelectedCVBook(null)
        setStudentGroups([])
        return
      }

      setLoadingStudents(true)
      try {
        // Admin can view inactive books:
        // - If a specific cvBookId is provided, use it.
        // - Otherwise, pick the first CV book matching the selected year.
        let cvBook: CVBook | null = null
        if (user?.admin) {
          if (cvBookIdParam) {
            cvBook = await fetchCVBookByIdAction(cvBookIdParam)
          }
          if (!cvBook) {
            const yearMatch = activeCVBooks.find((b) => {
              const y = typeof b.year === "object" ? b.year.id : b.year
              return y === selectedYearId
            })
            cvBook = yearMatch ?? null
          }
        } else {
          cvBook = await fetchCVBookByYearAction(selectedYearId)
        }

        setSelectedCVBook(cvBook)

        if (cvBook) {
          const groups = await fetchCVBookStudentDataAction(cvBook)
          // Filter and validate PDFs
          const validatedGroups = await validateAndFilterCVs(groups)
          setStudentGroups(validatedGroups)
        } else {
          setStudentGroups([])
        }
      } catch (error) {
        console.error("[CVBookPage] Error loading CV book data:", error)
        setSelectedCVBook(null)
        setStudentGroups([])
      } finally {
        setLoadingStudents(false)
      }
    }

    loadCVBookData()
  }, [selectedYearId, user?.admin, cvBookIdParam, activeCVBooks])

  // Validate PDF CVs (one page, PDF format)
  async function validateAndFilterCVs(groups: StudentCVGroup[]): Promise<StudentCVGroup[]> {
    const validatedGroups: StudentCVGroup[] = []

    // Validate all CVs in parallel for better performance
    const validationPromises: Promise<{ student: StudentCVData; isValid: boolean }>[] = []

    for (const group of groups) {
      for (const student of group.students) {
        if (!student.cvFileUrl || !student.cvFileId) {
          continue // Skip if no CV file
        }

        validationPromises.push(
          validatePDF(student.cvFileUrl, student.cvFileId)
            .then(isValid => ({ student, isValid }))
            .catch(error => {
              console.error(`[CVBookPage] Error validating CV for ${student.email}:`, error)
              return { student, isValid: false }
            })
        )
      }
    }

    // Wait for all validations to complete
    const results = await Promise.all(validationPromises)

    // Group validated students back by study
    const validatedByStudy = new Map<string, StudentCVData[]>()

    for (const { student, isValid } of results) {
      if (isValid) {
        if (!validatedByStudy.has(student.study)) {
          validatedByStudy.set(student.study, [])
        }
        validatedByStudy.get(student.study)!.push(student)
        setValidatedCVs(prev => new Map(prev).set(student.cvFileId!, true))
      } else {
        setValidatedCVs(prev => new Map(prev).set(student.cvFileId!, false))
      }
    }

    // Convert back to StudentCVGroup array
    for (const group of groups) {
      const validatedStudents = validatedByStudy.get(group.study) || []
      if (validatedStudents.length > 0) {
        validatedGroups.push({
          study: group.study,
          students: validatedStudents.sort((a, b) => {
            // Sort by last name, then first name
            const lastNameCompare = a.lastName.localeCompare(b.lastName)
            return lastNameCompare !== 0 ? lastNameCompare : a.firstName.localeCompare(b.firstName)
          }),
        })
      }
    }

    // Sort groups by study name
    return validatedGroups.sort((a, b) => a.study.localeCompare(b.study))
  }

  // Validate PDF: check if it's PDF format
  // Note: One-page validation would require PDF.js or server-side processing
  // For now, we validate PDF format and trust upload validation for page count
  async function validatePDF(fileUrl: string, fileId: string): Promise<boolean> {
    try {
      // Check file type - use GET instead of HEAD to avoid CORS issues
      const response = await fetch(fileUrl, { 
        method: 'GET',
        headers: { Range: 'bytes=0-4' }
      })
      
      if (!response.ok) {
        return false
      }

      const contentType = response.headers.get('content-type')
      if (contentType && !contentType.includes('application/pdf')) {
        return false
      }

      // Verify PDF signature by checking first bytes
      const arrayBuffer = await response.arrayBuffer()
      if (arrayBuffer.byteLength < 4) {
        return false
      }
      
      const bytes = new Uint8Array(arrayBuffer)
      const pdfSignature = String.fromCharCode(...bytes.slice(0, 4))
      
      // PDF files start with %PDF
      if (pdfSignature !== '%PDF') {
        return false
      }

      return true
    } catch (error) {
      console.error(`[CVBookPage] Error validating PDF ${fileId}:`, error)
      // If validation fails, we'll still show the CV but it might not display properly
      // This is better than hiding valid CVs due to network issues
      return true // Allow CV to be shown even if validation fails
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // If no active CV books, show coming soon page
  if (activeCVBooks.length === 0) {
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

  // Get unique years from active CV books
  const availableYears = activeCVBooks
    .map(book => typeof book.year === "object" ? book.year : null)
    .filter((year): year is AcademicYear => year !== null)
    .filter((year, index, self) => 
      index === self.findIndex(y => y.id === year.id)
    )
    .sort((a, b) => b.start_of_year.localeCompare(a.start_of_year))

  // Company has access and there are active CV books - show CV Book page
  return (
    <div className="container mx-auto p-8">
      <Card className="max-w-6xl w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-vtk-blue/10 p-6">
              <IconFileCv className="h-16 w-16 text-vtk-blue" />
            </div>
          </div>
          <CardTitle className="text-3xl sm:text-4xl font-bold mb-2">
            Resume Book
          </CardTitle>

          {/* Academic Year selector (always visible; if only one year, it will just show that one) */}
          <div className="mt-3 flex justify-center">
            <Select value={selectedYearId} onValueChange={setSelectedYearId}>
              <SelectTrigger id="year-select" className="w-fit px-2 gap-1">
                {selectedYearId && availableYears.find(y => y.id === selectedYearId) ? (
                  <span className="block truncate">
                    {availableYears.find(y => y.id === selectedYearId)?.name}
                  </span>
                ) : (
                  <SelectValue placeholder="Select year" />
                )}
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year.id} value={year.id}>
                    {year.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {loadingStudents ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading resume book...
            </div>
          ) : studentGroups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {selectedCVBook ? "No student CVs available for this academic year." : "Please select an academic year."}
            </div>
          ) : viewMode === "grid" ? (
            <Accordion type="multiple" className="w-full space-y-3">
              {studentGroups.map((group) => (
                <AccordionItem
                  key={group.study}
                  value={group.study}
                  className="border rounded-xl bg-white/80 shadow-sm ring-1 ring-black/5 px-2 hover:bg-white transition-colors"
                >
                  <AccordionTrigger className="px-3 cursor-pointer hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-2">
                      <span className="text-base sm:text-lg font-semibold text-neutral-900">{group.study}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-4">
                    <div className="grid grid-cols-2 gap-6 pt-4">
                      {group.students.map((student) => (
                        <Card
                          key={student.id}
                          className="cursor-pointer hover:shadow-lg transition-shadow flex flex-col h-full"
                          onClick={() => {
                            setSelectedStudent(student)
                            setViewMode("detail")
                          }}
                        >
                          <CardContent className="p-4 flex flex-col h-full">
                            <div className="rounded-lg mb-3 overflow-hidden border shadow-sm flex-1 min-h-[600px]">
                              {student.cvFileUrl ? (
                                <CVPreview
                                  fileUrl={student.cvFileUrl}
                                  className="w-full h-full"
                                  title={`CV for ${student.firstName} ${student.lastName}`}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted">
                                  <IconFileCv className="h-12 w-12" />
                                </div>
                              )}
                            </div>
                            <div className="text-center">
                              <p className="font-semibold">{student.firstName} {student.lastName}</p>
                              <p className="text-sm text-muted-foreground">{student.email}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : selectedStudent ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => {
                    setViewMode("grid")
                    setSelectedStudent(null)
                  }}
                >
                  ← Back to Overview
                </Button>

                {/* Prev/Next student navigation (above the student's card) */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    disabled={!hasPrevStudent}
                    onClick={() => {
                      if (!hasPrevStudent) return
                      const prev = flatStudents[selectedStudentIndex - 1]
                      if (prev) setSelectedStudent(prev)
                    }}
                  >
                    Previous student
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!hasNextStudent}
                    onClick={() => {
                      if (!hasNextStudent) return
                      const next = flatStudents[selectedStudentIndex + 1]
                      if (next) setSelectedStudent(next)
                    }}
                  >
                    Next student
                  </Button>
                </div>
              </div>
              
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl mb-2">
                        {selectedStudent.firstName} {selectedStudent.lastName}
                      </CardTitle>
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                          <IconMail className="h-5 w-5 text-muted-foreground" />
                          <a href={`mailto:${selectedStudent.email}`} className="text-vtk-blue hover:underline">
                            {selectedStudent.email}
                          </a>
                        </div>
                        <Badge variant="secondary">{selectedStudent.study}</Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedStudent.cvFileUrl && (
                    <div className="mt-4">
                      <CVDocumentViewer
                        fileUrl={selectedStudent.cvFileUrl}
                        title={`CV for ${selectedStudent.firstName} ${selectedStudent.lastName}`}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

