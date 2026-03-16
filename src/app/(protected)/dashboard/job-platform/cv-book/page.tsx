'use client'

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ComingSoon } from "@/components/dashboard/ComingSoon"
import { IconFileCv, IconMail } from "@tabler/icons-react"
import { Linkedin, Star } from "lucide-react"
import { CVFirstPagePreview } from "@/components/cv-first-page-preview"
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
  toggleCVBookFavouriteAction,
} from "@/app/actions/cv-book"
import type { Company, CVBook, AcademicYear } from "@/lib/schema"
import type { StudentCVGroup, StudentCVData } from "@/lib/repos/cv-book"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  const [viewMode, setViewMode] = useState<"grid" | "detail">("grid")
  const [favouriteIds, setFavouriteIds] = useState<Set<string>>(new Set())
  const [togglingFavourite, setTogglingFavourite] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<"study" | "firstName" | "lastName">("study")
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([])
  const [everOpenedCategories, setEverOpenedCategories] = useState<Set<string>>(new Set())

  const handleAccordionValueChange = useCallback((values: string[]) => {
    setOpenAccordionItems(values)
    setEverOpenedCategories(prev => {
      const newItems = values.filter(v => !prev.has(v))
      if (newItems.length === 0) return prev
      const next = new Set(prev)
      newItems.forEach(v => next.add(v))
      return next
    })
  }, [])

  const flatStudents = useMemo(() => {
    const all = studentGroups.flatMap((g) => g.students)
    if (sortBy === "firstName") {
      return [...all].sort((a, b) => a.firstName.localeCompare(b.firstName) || a.lastName.localeCompare(b.lastName))
    }
    if (sortBy === "lastName") {
      return [...all].sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName))
    }
    return all
  }, [studentGroups, sortBy])

  const selectedStudentIndex = useMemo(() => {
    if (!selectedStudent) return -1
    return flatStudents.findIndex((s) => s.id === selectedStudent.id)
  }, [flatStudents, selectedStudent])

  const hasPrevStudent = selectedStudentIndex > 0
  const hasNextStudent = selectedStudentIndex >= 0 && selectedStudentIndex < flatStudents.length - 1

  const showFavourites = !!user?.company?.id
  const favouriteStudents = useMemo(() => {
    if (!showFavourites || favouriteIds.size === 0) return []
    return flatStudents.filter((s) => favouriteIds.has(String(s.id)))
  }, [flatStudents, favouriteIds, showFavourites])

  async function handleToggleFavourite(student: StudentCVData, e: React.MouseEvent) {
    e.stopPropagation()
    if (!selectedCVBook?.id || togglingFavourite) return
    setTogglingFavourite(student.id)
    const isFav = favouriteIds.has(String(student.id))
    const result = await toggleCVBookFavouriteAction(student.id, selectedCVBook.id, isFav)
    setTogglingFavourite(null)
    if (result.success) {
      setFavouriteIds((prev) => {
        const next = new Set(prev)
        if (isFav) next.delete(String(student.id))
        else next.add(String(student.id))
        return next
      })
    }
  }

  useEffect(() => {
    async function loadData() {
      if (!user?.admin && !user?.company?.id) {
        setLoading(false)
        return
      }

      try {
        const books = user?.admin ? await fetchCVBooksAction() : await fetchActiveCVBooksAction()
        setActiveCVBooks(books)

        if (books.length === 0) {
          setLoading(false)
          return
        }

        if (user?.admin && cvBookIdParam && !selectedYearId) {
          const linkedBook = await fetchCVBookByIdAction(cvBookIdParam)
          if (linkedBook) {
            const yearId = typeof linkedBook.year === "object" ? linkedBook.year.id : linkedBook.year
            setSelectedYearId(yearId)
            setSelectedCVBook(linkedBook)
          }
        }

        if (!selectedYearId) {
          const mostRecentBook = books[0]
          const yearId = typeof mostRecentBook.year === "object" ? mostRecentBook.year.id : mostRecentBook.year
          setSelectedYearId(yearId)
        }

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

  useEffect(() => {
    async function loadCVBookData() {
      if (!selectedYearId) {
        setSelectedCVBook(null)
        setStudentGroups([])
        return
      }

      setLoadingStudents(true)
      setOpenAccordionItems([])
      setEverOpenedCategories(new Set())

      try {
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
          setStudentGroups(groups)
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

  useEffect(() => {
    async function loadFavourites() {
      if (!selectedCVBook?.id) {
        setFavouriteIds(new Set())
        return
      }
      const companyId = user?.company && (typeof user.company === "string" ? user.company : user.company.id)
      if (!companyId) {
        setFavouriteIds(new Set())
        return
      }
      try {
        const url = `/api/cv-book/favourites?cvBookId=${encodeURIComponent(selectedCVBook.id)}&companyId=${encodeURIComponent(companyId)}`
        const res = await fetch(url, { credentials: "include" })
        if (!res.ok) {
          const errText = await res.text()
          console.error("[CVBookPage] Favourites API error:", res.status, errText)
          throw new Error("Failed to fetch favourites")
        }
        const ids: (string | number)[] = await res.json()
        setFavouriteIds(new Set(ids.map((id) => String(id))))
      } catch {
        setFavouriteIds(new Set())
      }
    }
    loadFavourites()
  }, [selectedCVBook?.id, user?.company?.id, user?.admin])

  function renderStudentCard(student: StudentCVData) {
    return (
      <Card
        key={student.id}
        className="cursor-pointer hover:shadow-lg transition-shadow flex flex-col h-full relative"
        onClick={() => {
          setSelectedStudent(student)
          setViewMode("detail")
        }}
      >
        {showFavourites && (
          <button
            type="button"
            onClick={(e) => handleToggleFavourite(student, e)}
            disabled={!!togglingFavourite}
            className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/90 shadow-sm hover:bg-white transition-colors disabled:opacity-50"
            aria-label={favouriteIds.has(String(student.id)) ? "Remove from favourites" : "Add to favourites"}
          >
            <Star
              className={`h-5 w-5 ${favouriteIds.has(String(student.id)) ? "fill-amber-300 text-amber-400" : "text-muted-foreground"}`}
            />
          </button>
        )}
        <CardContent className="p-4 flex flex-col h-full">
          <div className="rounded-lg mb-3 overflow-hidden border shadow-sm aspect-[210/297]">
            {student.cvFileUrl ? (
              <CVFirstPagePreview
                fileUrl={student.cvFileUrl}
                fileId={student.cvFileId}
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
            {student.linkedinUrl && (
              <a
                href={student.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 mt-1 text-vtk-blue hover:underline"
                aria-label="View LinkedIn profile"
              >
                <Linkedin className="h-4 w-4" />
                LinkedIn
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (activeCVBooks.length === 0) {
    return (
      <ComingSoon
        title="CV Book"
        description="Our CV book platform is currently under development. Soon you'll be able to browse student CVs, search for candidates by skills and experience, and connect with talented students from the engineering faculty."
        icon={<IconFileCv className="h-16 w-16 text-vtk-blue" />}
      />
    )
  }

  if (!hasAccess) {
    return null
  }

  const availableYears = activeCVBooks
    .map(book => typeof book.year === "object" ? book.year : null)
    .filter((year): year is AcademicYear => year !== null)
    .filter((year, index, self) =>
      index === self.findIndex(y => y.id === year.id)
    )
    .sort((a, b) => b.start_of_year.localeCompare(a.start_of_year))

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

          <div className="mt-3 flex flex-wrap justify-center gap-4">
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
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as "study" | "firstName" | "lastName")}>
              <SelectTrigger id="sort-select" className="w-fit px-2 gap-1">
                <span className="block truncate">
                  {sortBy === "study" ? "By study" : sortBy === "firstName" ? "By first name" : "By last name"}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="study">By study</SelectItem>
                <SelectItem value="firstName">By first name</SelectItem>
                <SelectItem value="lastName">By last name</SelectItem>
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
            <Accordion
              type="multiple"
              className="w-full space-y-3"
              value={openAccordionItems}
              onValueChange={handleAccordionValueChange}
            >
              {showFavourites && favouriteStudents.length > 0 && (
                <AccordionItem
                  value="favourites"
                  className="border rounded-xl bg-white/80 shadow-sm ring-1 ring-black/5 px-2 hover:bg-white transition-colors"
                >
                  <AccordionTrigger className="px-3 cursor-pointer hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-2">
                      <span className="text-base sm:text-lg font-semibold text-neutral-900">Favourites</span>
                      <Badge variant="secondary" className="ml-2 text-xs">{favouriteStudents.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-4">
                    {everOpenedCategories.has("favourites") && (
                      <div className="grid grid-cols-2 gap-6 pt-4">
                        {favouriteStudents.map((student) => renderStudentCard(student))}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              )}
              {sortBy === "study" ? (
                studentGroups.map((group) => (
                  <AccordionItem
                    key={group.study}
                    value={group.study}
                    className="border rounded-xl bg-white/80 shadow-sm ring-1 ring-black/5 px-2 hover:bg-white transition-colors"
                  >
                    <AccordionTrigger className="px-3 cursor-pointer hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-2">
                        <span className="text-base sm:text-lg font-semibold text-neutral-900">{group.study}</span>
                        <Badge variant="secondary" className="ml-2 text-xs">{group.students.length}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-3 pb-4">
                      {everOpenedCategories.has(group.study) && (
                        <div className="grid grid-cols-2 gap-6 pt-4">
                          {group.students.map((student) => renderStudentCard(student))}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))
              ) : (
                <AccordionItem
                  value="all"
                  className="border rounded-xl bg-white/80 shadow-sm ring-1 ring-black/5 px-2 hover:bg-white transition-colors"
                >
                  <AccordionTrigger className="px-3 cursor-pointer hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-2">
                      <span className="text-base sm:text-lg font-semibold text-neutral-900">
                        {sortBy === "firstName" ? "Sorted by first name" : "Sorted by last name"}
                      </span>
                      <Badge variant="secondary" className="ml-2 text-xs">{flatStudents.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-4">
                    {everOpenedCategories.has("all") && (
                      <div className="grid grid-cols-2 gap-6 pt-4">
                        {(showFavourites && favouriteStudents.length > 0
                          ? flatStudents.filter((s) => !favouriteIds.has(String(s.id)))
                          : flatStudents
                        ).map((student) => renderStudentCard(student))}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          ) : selectedStudent ? (
            <div className="flex flex-col min-h-0" style={{ minHeight: 'calc(100vh - 12rem)' }}>
              <div className="flex items-center justify-between shrink-0 mb-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setViewMode("grid")
                    setSelectedStudent(null)
                  }}
                >
                  ← Back to Overview
                </Button>

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
              
              <Card className="flex flex-col flex-1 min-h-0">
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
                        {selectedStudent.linkedinUrl && (
                          <a
                            href={selectedStudent.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-vtk-blue hover:underline"
                            aria-label="View LinkedIn profile"
                          >
                            <Linkedin className="h-5 w-5" />
                            LinkedIn
                          </a>
                        )}
                        <Badge variant="secondary">{selectedStudent.study}</Badge>
                      </div>
                    </div>
                    {showFavourites && selectedCVBook?.id && (
                      <button
                        type="button"
                        onClick={(e) => handleToggleFavourite(selectedStudent, e)}
                        disabled={!!togglingFavourite}
                        className="p-2 rounded-full hover:bg-muted transition-colors disabled:opacity-50"
                        aria-label={favouriteIds.has(String(selectedStudent.id)) ? "Remove from favourites" : "Add to favourites"}
                      >
                        <Star
                          className={`h-6 w-6 ${favouriteIds.has(String(selectedStudent.id)) ? "fill-amber-300 text-amber-400" : "text-muted-foreground"}`}
                        />
                      </button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 flex flex-col">
                  {selectedStudent.cvFileUrl && (
                    <div className="mt-4 flex-1 min-h-0 flex flex-col">
                      <CVDocumentViewer
                        fileUrl={selectedStudent.cvFileUrl}
                        title={`CV for ${selectedStudent.firstName} ${selectedStudent.lastName}`}
                        className="flex-1 min-h-[70vh]"
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
