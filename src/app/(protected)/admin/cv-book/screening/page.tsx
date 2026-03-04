"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IconFileCv, IconMail } from "@tabler/icons-react";
import { Linkedin } from "lucide-react";
import { CVPreview } from "@/components/cv-preview";
import { CVDocumentViewer } from "@/components/cv-document-viewer";
import { useUser } from "@/providers/UserProvider";
import {
  fetchCVBooksAction,
  fetchCVBookByIdAction,
  fetchCVBookByYearForScreeningAction,
  fetchCVBookStudentDataForScreeningAction,
  approveCVAction,
  rejectCVAction,
  updateStudyOverrideAction,
  markCVBookScreeningCompleteAction,
  fetchStudyOptionsForCVBookAction,
} from "@/app/actions/cv-book";
import type { CVBook, AcademicYear } from "@/lib/schema";
import type { StudentCVData, StudentCVGroup } from "@/lib/repos/cv-book";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Check, X, Trash2, CheckCircle } from "lucide-react";

export default function CVBookScreeningPage() {
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const cvBookIdParam = searchParams.get("cvBookId");

  const [loading, setLoading] = useState(true);
  const [cvBooks, setCvBooks] = useState<CVBook[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [selectedCVBook, setSelectedCVBook] = useState<CVBook | null>(null);
  const [studentGroups, setStudentGroups] = useState<StudentCVGroup[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [editingStudy, setEditingStudy] = useState<string | null>(null);
  const [studyInput, setStudyInput] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [markingComplete, setMarkingComplete] = useState(false);
  const [studyOptions, setStudyOptions] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "detail">("grid");
  const [selectedStudent, setSelectedStudent] = useState<StudentCVData | null>(null);
  const [markCompleteError, setMarkCompleteError] = useState<string | null>(null);
  const [markCompleteDialogOpen, setMarkCompleteDialogOpen] = useState(false);

  const flatStudents = useMemo(
    () => studentGroups.flatMap((g) => g.students),
    [studentGroups]
  );
  const selectedStudentIndex = useMemo(
    () => (selectedStudent ? flatStudents.findIndex((s) => s.id === selectedStudent.id) : -1),
    [flatStudents, selectedStudent]
  );
  const hasPrevStudent = selectedStudentIndex > 0;
  const hasNextStudent = selectedStudentIndex >= 0 && selectedStudentIndex < flatStudents.length - 1;

  if (!user?.admin) {
    return (
      <div className="container mx-auto p-8">
        <p className="text-destructive">Access denied. Admin only.</p>
      </div>
    );
  }

  useEffect(() => {
    async function loadBooks() {
      setLoading(true);
      try {
        const books = await fetchCVBooksAction();
        setCvBooks(books);
        if (cvBookIdParam) {
          const linked = await fetchCVBookByIdAction(cvBookIdParam);
          if (linked) {
            const yearId = typeof linked.year === "object" ? linked.year.id : linked.year;
            setSelectedYearId(yearId);
            setSelectedCVBook(linked);
          }
        }
        if (!selectedYearId && books.length > 0) {
          const first = books[0];
          const yearId = typeof first.year === "object" ? first.year.id : first.year;
          setSelectedYearId(yearId);
        }
      } catch (error) {
        console.error("[Screening] Error loading books:", error);
      } finally {
        setLoading(false);
      }
    }
    loadBooks();
  }, [cvBookIdParam]);

  useEffect(() => {
    async function loadCVBookData() {
      if (!selectedYearId) {
        setSelectedCVBook(null);
        setStudentGroups([]);
        return;
      }
      setLoadingStudents(true);
      try {
        const yearMatch = cvBooks.find((b) => {
          const y = typeof b.year === "object" ? b.year.id : b.year;
          return y === selectedYearId;
        });
        const book = yearMatch ?? (await fetchCVBookByYearForScreeningAction(selectedYearId));
        if (book) {
          setSelectedCVBook(book);
          const [groups, options] = await Promise.all([
            fetchCVBookStudentDataForScreeningAction(book),
            fetchStudyOptionsForCVBookAction(book),
          ]);
          setStudentGroups(groups);
          setStudyOptions(options);
        } else {
          setSelectedCVBook(null);
          setStudentGroups([]);
          setStudyOptions([]);
        }
      } catch (error) {
        console.error("[Screening] Error loading CV book:", error);
        setStudentGroups([]);
        setStudyOptions([]);
      } finally {
        setLoadingStudents(false);
      }
    }
    loadCVBookData();
  }, [selectedYearId, cvBooks]);

  function updateStudentScreeningStatus(studentId: string | number, status: "approved" | "rejected") {
    const id = String(studentId);
    setStudentGroups((prev) =>
      prev.map((g) => ({
        ...g,
        students: g.students.map((s) =>
          String(s.id) === id ? { ...s, screeningStatus: status } : s
        ),
      }))
    );
    setSelectedStudent((prev) =>
      prev && String(prev.id) === id ? { ...prev, screeningStatus: status } : prev
    );
  }

  async function handleApprove(student: StudentCVData) {
    if (!selectedCVBook?.id) return;
    setActionLoading(student.id);
    updateStudentScreeningStatus(student.id, "approved");
    const result = await approveCVAction(selectedCVBook.id, student.id, student.study);
    setActionLoading(null);
    if (!result.success && selectedCVBook) {
      const groups = await fetchCVBookStudentDataForScreeningAction(selectedCVBook);
      setStudentGroups(groups);
    }
  }

  async function handleReject(student: StudentCVData) {
    if (!selectedCVBook?.id) return;
    setActionLoading(student.id);
    updateStudentScreeningStatus(student.id, "rejected");
    const result = await rejectCVAction(selectedCVBook.id, student.id);
    setActionLoading(null);
    if (!result.success && selectedCVBook) {
      const groups = await fetchCVBookStudentDataForScreeningAction(selectedCVBook);
      setStudentGroups(groups);
    }
  }

  async function handleStudySave(student: StudentCVData) {
    if (!selectedCVBook?.id || !studyInput.trim()) return;
    setActionLoading(student.id);
    const result = await updateStudyOverrideAction(selectedCVBook.id, student.id, studyInput.trim());
    setActionLoading(null);
    if (result.success && selectedCVBook) {
      setEditingStudy(null);
      // Refetch to get correct grouping (student may move to different study category)
      const groups = await fetchCVBookStudentDataForScreeningAction(selectedCVBook);
      setStudentGroups(groups);
      const updated = groups.flatMap((g) => g.students).find((s) => String(s.id) === String(student.id));
      if (updated) setSelectedStudent(updated);
    }
  }

  async function handleMarkComplete() {
    if (!selectedCVBook?.id) return;
    setMarkingComplete(true);
    const result = await markCVBookScreeningCompleteAction(selectedCVBook.id, true);
    setMarkingComplete(false);
    if (result.success) {
      setSelectedCVBook((prev) => (prev ? { ...prev, screening_complete: true } : null));
      setMarkCompleteError(null);
    } else {
      setMarkCompleteError(result.error ?? "Failed to mark as complete");
    }
  }

  const availableYears = cvBooks
    .map((b) => (typeof b.year === "object" ? b.year : null))
    .filter((y): y is AcademicYear => y !== null)
    .filter((y, i, self) => self.findIndex((x) => x.id === y.id) === i)
    .sort((a, b) => b.start_of_year.localeCompare(a.start_of_year));

  function formatDate(iso: string | undefined) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("nl-BE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  return (
    <div className="container mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">CV Book Screening</h1>
        <p className="text-muted-foreground">
          Screen CVs before they are shown to companies. Approve, reject, or edit field of study.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading CV Books...</div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-4">
                <Select value={selectedYearId} onValueChange={setSelectedYearId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((y) => (
                      <SelectItem key={y.id} value={y.id}>
                        {y.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCVBook && (
                  <>
                    <Badge variant={selectedCVBook.screening_complete ? "default" : "secondary"}>
                      {selectedCVBook.screening_complete ? "Ready for companies" : "Screening"}
                    </Badge>
                    {!selectedCVBook.screening_complete && (
                      <>
                        <Button
                          onClick={() => {
                            setMarkCompleteError(null);
                            setMarkCompleteDialogOpen(true);
                          }}
                          disabled={markingComplete}
                          className="gap-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Mark ready for companies
                        </Button>
                        <AlertDialog open={markCompleteDialogOpen} onOpenChange={setMarkCompleteDialogOpen}>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Mark ready for companies?</AlertDialogTitle>
                              <AlertDialogDescription>
                                {flatStudents.filter((s) => s.screeningStatus !== "rejected").length} of{" "}
                                {studentGroups.flatMap((g) => g.students).length} CVs will be visible to companies.
                                Rejected CVs stay hidden. New CVs added later will not show until screened.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={async () => {
                                  setMarkCompleteDialogOpen(false);
                                  await handleMarkComplete();
                                }}
                              >
                                Mark ready
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        {markCompleteError && (
                          <span className="text-sm text-destructive">{markCompleteError}</span>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </CardHeader>
          </Card>

          {loadingStudents ? (
            <div className="text-center py-8 text-muted-foreground">Loading CVs...</div>
          ) : viewMode === "detail" && selectedStudent ? (
            <div className="flex flex-col min-h-0" style={{ minHeight: "calc(100vh - 12rem)" }}>
              <div className="flex items-center justify-between shrink-0 mb-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setViewMode("grid");
                    setSelectedStudent(null);
                    setEditingStudy(null);
                  }}
                >
                  ← Back to Overview
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    disabled={!hasPrevStudent}
                    onClick={() => {
                      if (!hasPrevStudent) return;
                      const prev = flatStudents[selectedStudentIndex - 1];
                      if (prev) {
                        setSelectedStudent(prev);
                        setEditingStudy(null);
                      }
                    }}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!hasNextStudent}
                    onClick={() => {
                      if (!hasNextStudent) return;
                      const next = flatStudents[selectedStudentIndex + 1];
                      if (next) {
                        setSelectedStudent(next);
                        setEditingStudy(null);
                      }
                    }}
                  >
                    Next
                  </Button>
                </div>
              </div>
              <Card
                className={`flex flex-col flex-1 min-h-0 ${
                  selectedStudent?.screeningStatus === "rejected"
                    ? "border-destructive/50 bg-destructive/5"
                    : ""
                }`}
              >
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-4">
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
                          >
                            <Linkedin className="h-5 w-5" />
                            LinkedIn
                          </a>
                        )}
                        <Badge variant="secondary">{selectedStudent.study}</Badge>
                        <span className="text-xs text-muted-foreground">
                          Uploaded: {formatDate(selectedStudent.submittedAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedStudent?.screeningStatus === "approved" ? (
                        <Badge variant="default" className="gap-1">
                          <Check className="h-3 w-3" /> Approved
                        </Badge>
                      ) : selectedStudent?.screeningStatus === "rejected" ? (
                        <Badge variant="destructive" className="gap-1">
                          <X className="h-3 w-3" /> Rejected
                        </Badge>
                      ) : null}
                      {selectedStudent?.screeningStatus !== "rejected" && (
                        <Button
                          size="sm"
                          variant={selectedStudent?.screeningStatus === "approved" ? "outline" : "default"}
                          onClick={() => handleApprove(selectedStudent)}
                          disabled={actionLoading === selectedStudent.id}
                          className="gap-1"
                        >
                          <Check className="h-4 w-4" /> Approve
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={actionLoading === selectedStudent.id}
                            className="gap-1"
                          >
                            <Trash2 className="h-4 w-4" /> Remove
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove from CV Book?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Remove &quot;{selectedStudent.firstName} {selectedStudent.lastName}&quot; from the CV Book? They will not be shown to companies.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleReject(selectedStudent)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    {editingStudy === selectedStudent.id ? (
                      <>
                        {studyOptions.length > 0 ? (
                          <Select value={studyInput} onValueChange={setStudyInput}>
                            <SelectTrigger className="max-w-[220px]">
                              <SelectValue placeholder="Select field of study" />
                            </SelectTrigger>
                            <SelectContent>
                              {[
                                ...(studyInput && !studyOptions.includes(studyInput) ? [studyInput] : []),
                                ...studyOptions,
                              ].map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            value={studyInput}
                            onChange={(e) => setStudyInput(e.target.value)}
                            placeholder="Field of study"
                            className="max-w-[200px]"
                          />
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleStudySave(selectedStudent)}
                          disabled={actionLoading === selectedStudent.id}
                        >
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingStudy(null)}>
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm">
                          Study: <strong>{selectedStudent.study}</strong>
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingStudy(selectedStudent.id);
                            setStudyInput(selectedStudent.study);
                          }}
                        >
                          Edit
                        </Button>
                      </>
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
          ) : flatStudents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {selectedYearId ? "No CVs to screen for this year." : "Select an academic year."}
              </CardContent>
            </Card>
          ) : (
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
                      <span className="text-sm text-muted-foreground">
                        {group.students.length} CV{group.students.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-4">
                    <div className="space-y-4 pt-4">
                      {group.students.map((student) => {
                        const status = student.screeningStatus ?? "pending";
                        const isApproved = status === "approved";
                        const isRejected = status === "rejected";
                        const isLoading = actionLoading === student.id;

                        return (
                          <div
                            key={student.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              setSelectedStudent(student);
                              setViewMode("detail");
                              setEditingStudy(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setSelectedStudent(student);
                                setViewMode("detail");
                                setEditingStudy(null);
                              }
                            }}
                            className={`flex flex-col sm:flex-row gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                              isRejected ? "bg-destructive/10 border-destructive/30 hover:bg-destructive/15" : "hover:bg-muted/50"
                            }`}
                          >
                            <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">
                                  {student.firstName} {student.lastName}
                                </span>
                                {isApproved && (
                                  <Badge variant="default" className="gap-1">
                                    <Check className="h-3 w-3" /> Approved
                                  </Badge>
                                )}
                                {isRejected && (
                                  <Badge variant="destructive" className="gap-1">
                                    <X className="h-3 w-3" /> Rejected
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{student.email}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Uploaded: {formatDate(student.submittedAt)}
                              </p>
                              <div className="mt-2 flex items-center gap-2">
                                {editingStudy === student.id ? (
                                  <>
                                    {studyOptions.length > 0 ? (
                                      <Select
                                        value={studyInput}
                                        onValueChange={setStudyInput}
                                      >
                                        <SelectTrigger className="max-w-[220px]">
                                          <SelectValue placeholder="Select field of study" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {[
                                            ...(studyInput && !studyOptions.includes(studyInput) ? [studyInput] : []),
                                            ...studyOptions,
                                          ].map((opt) => (
                                            <SelectItem key={opt} value={opt}>
                                              {opt}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <Input
                                        value={studyInput}
                                        onChange={(e) => setStudyInput(e.target.value)}
                                        placeholder="Field of study"
                                        className="max-w-[200px]"
                                      />
                                    )}
                                    <Button size="sm" onClick={() => handleStudySave(student)} disabled={isLoading}>
                                      Save
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setEditingStudy(null)}>
                                      Cancel
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-sm">
                                      Study: <strong>{student.study}</strong>
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setEditingStudy(student.id);
                                        setStudyInput(student.study);
                                      }}
                                    >
                                      Edit
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="w-32 h-40 rounded border overflow-hidden bg-muted flex-shrink-0">
                                {student.cvFileUrl ? (
                                  <CVPreview
                                    fileUrl={student.cvFileUrl}
                                    className="w-full h-full min-h-0"
                                    title={`CV ${student.firstName} ${student.lastName}`}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <IconFileCv className="h-10 w-10 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col gap-1">
                                {!isRejected && (
                                  <Button
                                    size="sm"
                                    variant={isApproved ? "outline" : "default"}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleApprove(student);
                                    }}
                                    disabled={isLoading}
                                    className="gap-1"
                                  >
                                    <Check className="h-4 w-4" /> Approve
                                  </Button>
                                )}
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      disabled={isLoading}
                                      className="gap-1"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Trash2 className="h-4 w-4" /> Remove
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Remove from CV Book?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Remove &quot;{student.firstName} {student.lastName}&quot; from the CV Book? They will not be shown to companies.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleReject(student);
                                        }}
                                        className="bg-destructive hover:bg-destructive/90"
                                      >
                                        Remove
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </>
      )}
    </div>
  );
}
