"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  fetchCVBooksAction,
  createCVBookAction,
  updateCVBookAction,
  deleteCVBookAction,
  fetchAcademicYearsAction,
  fetchFormsAction,
  getFormFieldsAcrossAllVersions,
  toggleCVBookActiveAction,
} from "@/app/actions/cv-book";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Check, X, Plus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useUser } from "@/providers/UserProvider";
import type { CVBook, AcademicYear, Form, FormField } from "@/lib/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, ChevronDown, Trash2, Pencil } from "lucide-react";

type CVBookRow = CVBook & {
  year: AcademicYear;
  form: Form;
};

export default function AdminCVBookPage() {
  const { user } = useUser();
  const [refreshKey, setRefreshKey] = useState(0);
  
  if (!user?.admin) return <p>NO ACCESS</p>;

  const handleCVBookCreated = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="container mx-auto p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">CV Book Management</h1>
          <p className="text-muted-foreground">Manage CV Books per academic year</p>
        </div>
        <CreateCVBookDialog onCreated={handleCVBookCreated} />
      </div>

      <CVBooksTable key={refreshKey} />
    </div>
  );
}

function CVBooksTable() {
  const router = useRouter();
  const [cvBooks, setCvBooks] = useState<CVBookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBook, setEditingBook] = useState<CVBookRow | null>(null);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    academicYear: true,
    form: true,
    firstNameField: true,
    lastNameField: true,
    emailField: true,
    studyField: true,
    cvField: true,
  });

  const loadCVBooks = async () => {
    setLoading(true);
    try {
      const data = await fetchCVBooksAction();
      // Transform the data to ensure proper typing
      const transformed = data.map((book) => ({
        ...book,
        year: typeof book.year === "string" ? { id: book.year } as AcademicYear : book.year,
        form: typeof book.form === "string" ? { id: book.form } as Form : book.form,
      })) as CVBookRow[];
      setCvBooks(transformed);
    } catch (error) {
      console.error("[CVBooksTable] Error loading CV books:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCVBooks();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this CV Book? This action cannot be undone.")) {
      return;
    }

    const result = await deleteCVBookAction(id);
    if (result.success) {
      loadCVBooks();
    } else {
      alert(`Failed to delete CV Book: ${result.error}`);
    }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    const result = await toggleCVBookActiveAction(id, active);
    if (result.success) {
      loadCVBooks();
    } else {
      alert(`Failed to ${active ? 'activate' : 'deactivate'} CV Book: ${result.error}`);
    }
  };

  const columns: ColumnDef<CVBookRow>[] = [
    {
      accessorKey: "year",
      header: "Academic Year",
      id: "academicYear",
      cell: ({ row }) => {
        const year = typeof row.original.year === "object" ? row.original.year : null;
        return <div className="font-medium">{year?.name || "Unknown"}</div>;
      },
    },
    {
      accessorKey: "form",
      header: "Form",
      id: "form",
      cell: ({ row }) => {
        const form = typeof row.original.form === "object" ? row.original.form : null;
        return <div>{form?.name || "Unknown"}</div>;
      },
    },
    {
      accessorKey: "student_first_name_field",
      header: "First Name Field",
      id: "firstNameField",
    },
    {
      accessorKey: "student_last_name_field",
      header: "Last Name Field",
      id: "lastNameField",
    },
    {
      accessorKey: "student_email_field",
      header: "Email Field",
      id: "emailField",
    },
    {
      accessorKey: "student_study_field",
      header: "Study Field",
      id: "studyField",
    },
    {
      accessorKey: "student_cv_field",
      header: "CV Field",
      id: "cvField",
    },
    {
      accessorKey: "active",
      header: "Active",
      id: "active",
      cell: ({ row }) => {
        const isActive = row.original.active;
        return (
          <div className="flex items-center">
            {isActive ? (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Active
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                Inactive
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const book = row.original;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => router.push(`/dashboard/job-platform/cv-book?cvBookId=${book.id}`)}
                >
                  View CV Book
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEditingBook(book)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {!book.active ? (
                  <DropdownMenuItem
                    onClick={() => handleToggleActive(book.id, true)}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Activate
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => handleToggleActive(book.id, false)}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Deactivate
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleDelete(book.id)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: cvBooks,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      columnVisibility,
    },
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading CV Books...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {editingBook && (
        <EditCVBookDialog
          cvBook={editingBook}
          open={!!editingBook}
          onOpenChange={(open) => !open && setEditingBook(null)}
          onUpdated={() => {
            loadCVBooks();
            setEditingBook(null);
          }}
        />
      )}
      <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>All CV Books</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <ChevronDown className="mr-2 h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id === "academicYear" && "Academic Year"}
                      {column.id === "form" && "Form"}
                      {column.id === "firstNameField" && "First Name Field"}
                      {column.id === "lastNameField" && "Last Name Field"}
                      {column.id === "emailField" && "Email Field"}
                      {column.id === "studyField" && "Study Field"}
                      {column.id === "cvField" && "CV Field"}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        {cvBooks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No CV Books yet. Create your first CV Book to get started.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id} className={header.id === "actions" ? "text-right" : ""}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className={cell.column.id === "actions" ? "text-right" : ""}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
    </>
  );
}

function CreateCVBookDialog({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [selectedFormId, setSelectedFormId] = useState<string>("");
  const [studentFirstNameField, setStudentFirstNameField] = useState<string>("");
  const [studentLastNameField, setStudentLastNameField] = useState<string>("");
  const [studentEmailField, setStudentEmailField] = useState<string>("");
  const [studentStudyField, setStudentStudyField] = useState<string>("");
  const [studentCVField, setStudentCVField] = useState<string>("");
  const [backupFieldsEnabled, setBackupFieldsEnabled] = useState(false);
  const [studentFirstNameFieldBackup, setStudentFirstNameFieldBackup] = useState<string>("");
  const [studentLastNameFieldBackup, setStudentLastNameFieldBackup] = useState<string>("");
  const [studentEmailFieldBackup, setStudentEmailFieldBackup] = useState<string>("");
  const [studentStudyFieldBackup, setStudentStudyFieldBackup] = useState<string>("");
  const [studentCVFieldBackup, setStudentCVFieldBackup] = useState<string>("");
  const [studentLinkedinField, setStudentLinkedinField] = useState<string>("");
  const [studentLinkedinFieldBackup, setStudentLinkedinFieldBackup] = useState<string>("");

  useEffect(() => {
    if (open) {
      // Load academic years and forms when dialog opens
      Promise.all([
        fetchAcademicYearsAction(),
        fetchFormsAction(),
      ]).then(([years, formsList]) => {
        setAcademicYears(years);
        setForms(formsList);
      });
    }
  }, [open]);

  // Load form fields when form is selected
  useEffect(() => {
    if (selectedFormId) {
      // Add a small delay to prevent rapid successive calls
      const timeoutId = setTimeout(() => {
        getFormFieldsAcrossAllVersions(selectedFormId)
          .then((fields) => {
            setFormFields(fields);
            // Reset field selections when form changes
            setStudentFirstNameField("");
            setStudentLastNameField("");
            setStudentEmailField("");
            setStudentStudyField("");
            setStudentCVField("");
            setStudentLinkedinField("");
            setStudentFirstNameFieldBackup("");
            setStudentLastNameFieldBackup("");
            setStudentEmailFieldBackup("");
            setStudentStudyFieldBackup("");
            setStudentCVFieldBackup("");
            setStudentLinkedinFieldBackup("");
          })
          .catch((error) => {
            console.error("[CreateCVBookDialog] Error loading form fields:", error);
            setFormFields([]);
          });
      }, 300); // 300ms debounce
      
      return () => clearTimeout(timeoutId);
    } else {
      setFormFields([]);
    }
  }, [selectedFormId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedYearId || !selectedFormId || !studentFirstNameField || !studentLastNameField || !studentEmailField || !studentStudyField || !studentCVField) {
      alert("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const submitData = {
        year: selectedYearId,
        form: selectedFormId,
        student_first_name_field: studentFirstNameField,
        student_last_name_field: studentLastNameField,
        student_email_field: studentEmailField,
        student_study_field: studentStudyField,
        student_cv_field: studentCVField,
        ...(studentLinkedinField && { student_linkedin_field: studentLinkedinField }),
        ...(backupFieldsEnabled && {
          student_first_name_field_backup: studentFirstNameFieldBackup || undefined,
          student_last_name_field_backup: studentLastNameFieldBackup || undefined,
          student_email_field_backup: studentEmailFieldBackup || undefined,
          student_study_field_backup: studentStudyFieldBackup || undefined,
          student_cv_field_backup: studentCVFieldBackup || undefined,
          ...(studentLinkedinFieldBackup && { student_linkedin_field_backup: studentLinkedinFieldBackup }),
        }),
      };
      console.log("[CreateCVBookDialog] Submitting:", submitData);
      const result = await createCVBookAction(submitData);

      if (result.success) {
        setOpen(false);
        // Reset form
        setSelectedYearId("");
        setSelectedFormId("");
        setStudentFirstNameField("");
        setStudentLastNameField("");
        setStudentEmailField("");
        setStudentStudyField("");
        setStudentCVField("");
        setBackupFieldsEnabled(false);
        setStudentFirstNameFieldBackup("");
        setStudentLastNameFieldBackup("");
        setStudentEmailFieldBackup("");
        setStudentStudyFieldBackup("");
        setStudentCVFieldBackup("");
        setStudentLinkedinField("");
        setStudentLinkedinFieldBackup("");
        setFormFields([]);
        // Trigger table reload
        if (onCreated) {
          onCreated();
        }
      } else {
        alert(`Failed to create CV Book: ${result.error}`);
      }
    } catch (error) {
      console.error("[CreateCVBookDialog] Error:", error);
      alert("Failed to create CV Book");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create CV Book
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New CV Book</DialogTitle>
          <DialogDescription>
            Create a new CV Book for an academic year. Select a form and map its fields to student data.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="year">Academic Year *</Label>
            <Select value={selectedYearId} onValueChange={setSelectedYearId} required>
              <SelectTrigger id="year" className="w-full">
                {selectedYearId && academicYears.find(y => y.id === selectedYearId) ? (
                  <span className="block truncate">
                    {academicYears.find(y => y.id === selectedYearId)?.name} ({academicYears.find(y => y.id === selectedYearId)?.start_of_year} - {academicYears.find(y => y.id === selectedYearId)?.end_of_year})
                  </span>
                ) : (
                  <SelectValue placeholder="Select an academic year" />
                )}
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((year) => (
                  <SelectItem key={year.id} value={year.id}>
                    {year.name} ({year.start_of_year} - {year.end_of_year})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="form">Form *</Label>
            <Select value={selectedFormId} onValueChange={setSelectedFormId} required>
              <SelectTrigger id="form" className="w-full">
                {selectedFormId && forms.find(f => f.id === selectedFormId) ? (
                  <span className="block truncate">
                    {forms.find(f => f.id === selectedFormId)?.name}
                  </span>
                ) : (
                  <SelectValue placeholder="Select a form" />
                )}
              </SelectTrigger>
              <SelectContent>
                {forms.map((form) => (
                  <SelectItem key={form.id} value={form.id}>
                    {form.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Field mappings will work across all versions of this form.
            </p>
          </div>

          {formFields.length > 0 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="student-first-name-field">Student First Name Field *</Label>
                <Select value={studentFirstNameField} onValueChange={setStudentFirstNameField} required>
                  <SelectTrigger id="student-first-name-field" className="w-full">
                    {studentFirstNameField && formFields.find(f => f.name === studentFirstNameField) ? (
                      <span className="block truncate">
                        {formFields.find(f => f.name === studentFirstNameField)?.label || formFields.find(f => f.name === studentFirstNameField)?.name} ({studentFirstNameField})
                      </span>
                    ) : (
                      <SelectValue placeholder="Select field for student first name" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {formFields.map((field) => (
                      <SelectItem key={field.name} value={field.name}>
                        {field.label || field.name} ({field.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="student-last-name-field">Student Last Name Field *</Label>
                <Select value={studentLastNameField} onValueChange={setStudentLastNameField} required>
                  <SelectTrigger id="student-last-name-field" className="w-full">
                    {studentLastNameField && formFields.find(f => f.name === studentLastNameField) ? (
                      <span className="block truncate">
                        {formFields.find(f => f.name === studentLastNameField)?.label || formFields.find(f => f.name === studentLastNameField)?.name} ({studentLastNameField})
                      </span>
                    ) : (
                      <SelectValue placeholder="Select field for student last name" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {formFields.map((field) => (
                      <SelectItem key={field.name} value={field.name}>
                        {field.label || field.name} ({field.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="student-email-field">Student Email Field *</Label>
                <Select value={studentEmailField} onValueChange={setStudentEmailField} required>
                  <SelectTrigger id="student-email-field" className="w-full">
                    {studentEmailField && formFields.find(f => f.name === studentEmailField) ? (
                      <span className="block truncate">
                        {formFields.find(f => f.name === studentEmailField)?.label || formFields.find(f => f.name === studentEmailField)?.name} ({studentEmailField})
                      </span>
                    ) : (
                      <SelectValue placeholder="Select field for student email" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {formFields.map((field) => (
                      <SelectItem key={field.name} value={field.name}>
                        {field.label || field.name} ({field.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="student-study-field">Student Study Field *</Label>
                <Select value={studentStudyField} onValueChange={setStudentStudyField} required>
                  <SelectTrigger id="student-study-field" className="w-full">
                    {studentStudyField && formFields.find(f => f.name === studentStudyField) ? (
                      <span className="block truncate">
                        {formFields.find(f => f.name === studentStudyField)?.label || formFields.find(f => f.name === studentStudyField)?.name} ({studentStudyField})
                      </span>
                    ) : (
                      <SelectValue placeholder="Select field for student study/program" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {formFields.map((field) => (
                      <SelectItem key={field.name} value={field.name}>
                        {field.label || field.name} ({field.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="student-cv-field">Student CV Field *</Label>
                <Select value={studentCVField} onValueChange={setStudentCVField} required>
                  <SelectTrigger id="student-cv-field" className="w-full">
                    {studentCVField && formFields.find(f => f.name === studentCVField) ? (
                      <span className="block truncate">
                        {formFields.find(f => f.name === studentCVField)?.label || formFields.find(f => f.name === studentCVField)?.name} ({studentCVField})
                      </span>
                    ) : (
                      <SelectValue placeholder="Select field for student CV/file" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {formFields.map((field) => (
                      <SelectItem key={field.name} value={field.name}>
                        {field.label || field.name} ({field.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="student-linkedin-field">Student LinkedIn Field (Optional)</Label>
                <Select value={studentLinkedinField || "__none__"} onValueChange={(val) => setStudentLinkedinField(val === "__none__" ? "" : val)}>
                  <SelectTrigger id="student-linkedin-field" className="w-full">
                    {studentLinkedinField && formFields.find(f => f.name === studentLinkedinField) ? (
                      <span className="block truncate">
                        {formFields.find(f => f.name === studentLinkedinField)?.label || formFields.find(f => f.name === studentLinkedinField)?.name} ({studentLinkedinField})
                      </span>
                    ) : (
                      <SelectValue placeholder="Select field for LinkedIn profile URL" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {formFields.map((field) => (
                      <SelectItem key={field.name} value={field.name}>
                        {field.label || field.name} ({field.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2 pt-4 border-t">
                <Checkbox
                  id="backup-fields"
                  checked={backupFieldsEnabled}
                  onCheckedChange={(checked) => setBackupFieldsEnabled(checked === true)}
                />
                <Label htmlFor="backup-fields" className="text-sm font-medium cursor-pointer">
                  Backup fields on
                </Label>
              </div>

              {backupFieldsEnabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="student-first-name-field-backup">Student First Name Field Backup (Optional)</Label>
                    <Select value={studentFirstNameFieldBackup || undefined} onValueChange={(val) => setStudentFirstNameFieldBackup(val || "")}>
                      <SelectTrigger id="student-first-name-field-backup" className="w-full">
                        {studentFirstNameFieldBackup && formFields.find(f => f.name === studentFirstNameFieldBackup) ? (
                          <span className="block truncate">
                            {formFields.find(f => f.name === studentFirstNameFieldBackup)?.label || formFields.find(f => f.name === studentFirstNameFieldBackup)?.name} ({studentFirstNameFieldBackup})
                          </span>
                        ) : (
                          <SelectValue placeholder="Select backup field for student first name" />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {formFields.map((field) => (
                          <SelectItem key={field.name} value={field.name}>
                            {field.label || field.name} ({field.name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="student-last-name-field-backup">Student Last Name Field Backup (Optional)</Label>
                    <Select value={studentLastNameFieldBackup || undefined} onValueChange={(val) => setStudentLastNameFieldBackup(val || "")}>
                      <SelectTrigger id="student-last-name-field-backup" className="w-full">
                        {studentLastNameFieldBackup && formFields.find(f => f.name === studentLastNameFieldBackup) ? (
                          <span className="block truncate">
                            {formFields.find(f => f.name === studentLastNameFieldBackup)?.label || formFields.find(f => f.name === studentLastNameFieldBackup)?.name} ({studentLastNameFieldBackup})
                          </span>
                        ) : (
                          <SelectValue placeholder="Select backup field for student last name" />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {formFields.map((field) => (
                          <SelectItem key={field.name} value={field.name}>
                            {field.label || field.name} ({field.name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="student-email-field-backup">Student Email Field Backup (Optional)</Label>
                    <Select value={studentEmailFieldBackup || undefined} onValueChange={(val) => setStudentEmailFieldBackup(val || "")}>
                      <SelectTrigger id="student-email-field-backup" className="w-full">
                        {studentEmailFieldBackup && formFields.find(f => f.name === studentEmailFieldBackup) ? (
                          <span className="block truncate">
                            {formFields.find(f => f.name === studentEmailFieldBackup)?.label || formFields.find(f => f.name === studentEmailFieldBackup)?.name} ({studentEmailFieldBackup})
                          </span>
                        ) : (
                          <SelectValue placeholder="Select backup field for student email" />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {formFields.map((field) => (
                          <SelectItem key={field.name} value={field.name}>
                            {field.label || field.name} ({field.name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="student-study-field-backup">Student Study Field Backup (Optional)</Label>
                    <Select value={studentStudyFieldBackup || undefined} onValueChange={(val) => setStudentStudyFieldBackup(val || "")}>
                      <SelectTrigger id="student-study-field-backup" className="w-full">
                        {studentStudyFieldBackup && formFields.find(f => f.name === studentStudyFieldBackup) ? (
                          <span className="block truncate">
                            {formFields.find(f => f.name === studentStudyFieldBackup)?.label || formFields.find(f => f.name === studentStudyFieldBackup)?.name} ({studentStudyFieldBackup})
                          </span>
                        ) : (
                          <SelectValue placeholder="Select backup field for student study/program" />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {formFields.map((field) => (
                          <SelectItem key={field.name} value={field.name}>
                            {field.label || field.name} ({field.name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="student-cv-field-backup">Student CV Field Backup (Optional)</Label>
                    <Select value={studentCVFieldBackup || undefined} onValueChange={(val) => setStudentCVFieldBackup(val || "")}>
                      <SelectTrigger id="student-cv-field-backup" className="w-full">
                        {studentCVFieldBackup && formFields.find(f => f.name === studentCVFieldBackup) ? (
                          <span className="block truncate">
                            {formFields.find(f => f.name === studentCVFieldBackup)?.label || formFields.find(f => f.name === studentCVFieldBackup)?.name} ({studentCVFieldBackup})
                          </span>
                        ) : (
                          <SelectValue placeholder="Select backup field for student CV/file" />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {formFields.map((field) => (
                          <SelectItem key={field.name} value={field.name}>
                            {field.label || field.name} ({field.name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="student-linkedin-field-backup">Student LinkedIn Field Backup (Optional)</Label>
                    <Select value={studentLinkedinFieldBackup || "__none__"} onValueChange={(val) => setStudentLinkedinFieldBackup(val === "__none__" ? "" : val)}>
                      <SelectTrigger id="student-linkedin-field-backup" className="w-full">
                        {studentLinkedinFieldBackup && formFields.find(f => f.name === studentLinkedinFieldBackup) ? (
                          <span className="block truncate">
                            {formFields.find(f => f.name === studentLinkedinFieldBackup)?.label || formFields.find(f => f.name === studentLinkedinFieldBackup)?.name} ({studentLinkedinFieldBackup})
                          </span>
                        ) : (
                          <SelectValue placeholder="Select backup field for LinkedIn profile URL" />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {formFields.map((field) => (
                          <SelectItem key={field.name} value={field.name}>
                            {field.label || field.name} ({field.name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </>
          )}

          {selectedFormId && formFields.length === 0 && (
            <div className="text-sm text-muted-foreground">
              Loading form fields...
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedYearId || !selectedFormId || !studentFirstNameField || !studentLastNameField || !studentEmailField || !studentStudyField || !studentCVField}>
              {loading ? "Creating..." : "Create CV Book"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditCVBookDialog({
  cvBook,
  open,
  onOpenChange,
  onUpdated,
}: {
  cvBook: CVBookRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [studentFirstNameField, setStudentFirstNameField] = useState<string>("");
  const [studentLastNameField, setStudentLastNameField] = useState<string>("");
  const [studentEmailField, setStudentEmailField] = useState<string>("");
  const [studentStudyField, setStudentStudyField] = useState<string>("");
  const [studentCVField, setStudentCVField] = useState<string>("");
  const [studentLinkedinField, setStudentLinkedinField] = useState<string>("");
  const [backupFieldsEnabled, setBackupFieldsEnabled] = useState(false);
  const [studentFirstNameFieldBackup, setStudentFirstNameFieldBackup] = useState<string>("");
  const [studentLastNameFieldBackup, setStudentLastNameFieldBackup] = useState<string>("");
  const [studentEmailFieldBackup, setStudentEmailFieldBackup] = useState<string>("");
  const [studentStudyFieldBackup, setStudentStudyFieldBackup] = useState<string>("");
  const [studentCVFieldBackup, setStudentCVFieldBackup] = useState<string>("");
  const [studentLinkedinFieldBackup, setStudentLinkedinFieldBackup] = useState<string>("");

  const formId = typeof cvBook.form === "object" ? cvBook.form.id : cvBook.form;

  useEffect(() => {
    if (open && formId) {
      getFormFieldsAcrossAllVersions(formId)
        .then((fields) => {
          setFormFields(fields);
          setStudentFirstNameField(cvBook.student_first_name_field || "");
          setStudentLastNameField(cvBook.student_last_name_field || "");
          setStudentEmailField(cvBook.student_email_field || "");
          setStudentStudyField(cvBook.student_study_field || "");
          setStudentCVField(cvBook.student_cv_field || "");
          setStudentLinkedinField(cvBook.student_linkedin_field || "");
          setBackupFieldsEnabled(!!(
            cvBook.student_first_name_field_backup ||
            cvBook.student_last_name_field_backup ||
            cvBook.student_email_field_backup ||
            cvBook.student_study_field_backup ||
            cvBook.student_cv_field_backup ||
            cvBook.student_linkedin_field_backup
          ));
          setStudentFirstNameFieldBackup(cvBook.student_first_name_field_backup || "");
          setStudentLastNameFieldBackup(cvBook.student_last_name_field_backup || "");
          setStudentEmailFieldBackup(cvBook.student_email_field_backup || "");
          setStudentStudyFieldBackup(cvBook.student_study_field_backup || "");
          setStudentCVFieldBackup(cvBook.student_cv_field_backup || "");
          setStudentLinkedinFieldBackup(cvBook.student_linkedin_field_backup || "");
        })
        .catch((error) => {
          console.error("[EditCVBookDialog] Error loading form fields:", error);
          setFormFields([]);
        });
    }
  }, [open, formId, cvBook]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentFirstNameField || !studentLastNameField || !studentEmailField || !studentStudyField || !studentCVField) {
      alert("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const updateData: Partial<CVBook> = {
        student_first_name_field: studentFirstNameField,
        student_last_name_field: studentLastNameField,
        student_email_field: studentEmailField,
        student_study_field: studentStudyField,
        student_cv_field: studentCVField,
        student_linkedin_field: studentLinkedinField || undefined,
        ...(backupFieldsEnabled && {
          student_first_name_field_backup: studentFirstNameFieldBackup || undefined,
          student_last_name_field_backup: studentLastNameFieldBackup || undefined,
          student_email_field_backup: studentEmailFieldBackup || undefined,
          student_study_field_backup: studentStudyFieldBackup || undefined,
          student_cv_field_backup: studentCVFieldBackup || undefined,
          student_linkedin_field_backup: studentLinkedinFieldBackup || undefined,
        }),
      };
      const result = await updateCVBookAction(cvBook.id, updateData);

      if (result.success) {
        onOpenChange(false);
        onUpdated();
      } else {
        alert(`Failed to update CV Book: ${result.error}`);
      }
    } catch (error) {
      console.error("[EditCVBookDialog] Error:", error);
      alert("Failed to update CV Book");
    } finally {
      setLoading(false);
    }
  };

  const yearName = typeof cvBook.year === "object" ? cvBook.year?.name : "—";
  const formName = typeof cvBook.form === "object" ? cvBook.form?.name : "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit CV Book Details</DialogTitle>
          <DialogDescription>
            Edit field mappings for this CV Book. Year: {yearName}, Form: {formName}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formFields.length > 0 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="edit-student-first-name-field">Student First Name Field *</Label>
                <Select value={studentFirstNameField} onValueChange={setStudentFirstNameField} required>
                  <SelectTrigger id="edit-student-first-name-field" className="w-full">
                    {studentFirstNameField && formFields.find(f => f.name === studentFirstNameField) ? (
                      <span className="block truncate">
                        {formFields.find(f => f.name === studentFirstNameField)?.label || formFields.find(f => f.name === studentFirstNameField)?.name} ({studentFirstNameField})
                      </span>
                    ) : (
                      <SelectValue placeholder="Select field for student first name" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {formFields.map((field) => (
                      <SelectItem key={field.name} value={field.name}>
                        {field.label || field.name} ({field.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-student-last-name-field">Student Last Name Field *</Label>
                <Select value={studentLastNameField} onValueChange={setStudentLastNameField} required>
                  <SelectTrigger id="edit-student-last-name-field" className="w-full">
                    {studentLastNameField && formFields.find(f => f.name === studentLastNameField) ? (
                      <span className="block truncate">
                        {formFields.find(f => f.name === studentLastNameField)?.label || formFields.find(f => f.name === studentLastNameField)?.name} ({studentLastNameField})
                      </span>
                    ) : (
                      <SelectValue placeholder="Select field for student last name" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {formFields.map((field) => (
                      <SelectItem key={field.name} value={field.name}>
                        {field.label || field.name} ({field.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-student-email-field">Student Email Field *</Label>
                <Select value={studentEmailField} onValueChange={setStudentEmailField} required>
                  <SelectTrigger id="edit-student-email-field" className="w-full">
                    {studentEmailField && formFields.find(f => f.name === studentEmailField) ? (
                      <span className="block truncate">
                        {formFields.find(f => f.name === studentEmailField)?.label || formFields.find(f => f.name === studentEmailField)?.name} ({studentEmailField})
                      </span>
                    ) : (
                      <SelectValue placeholder="Select field for student email" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {formFields.map((field) => (
                      <SelectItem key={field.name} value={field.name}>
                        {field.label || field.name} ({field.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-student-study-field">Student Study Field *</Label>
                <Select value={studentStudyField} onValueChange={setStudentStudyField} required>
                  <SelectTrigger id="edit-student-study-field" className="w-full">
                    {studentStudyField && formFields.find(f => f.name === studentStudyField) ? (
                      <span className="block truncate">
                        {formFields.find(f => f.name === studentStudyField)?.label || formFields.find(f => f.name === studentStudyField)?.name} ({studentStudyField})
                      </span>
                    ) : (
                      <SelectValue placeholder="Select field for student study/program" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {formFields.map((field) => (
                      <SelectItem key={field.name} value={field.name}>
                        {field.label || field.name} ({field.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-student-cv-field">Student CV Field *</Label>
                <Select value={studentCVField} onValueChange={setStudentCVField} required>
                  <SelectTrigger id="edit-student-cv-field" className="w-full">
                    {studentCVField && formFields.find(f => f.name === studentCVField) ? (
                      <span className="block truncate">
                        {formFields.find(f => f.name === studentCVField)?.label || formFields.find(f => f.name === studentCVField)?.name} ({studentCVField})
                      </span>
                    ) : (
                      <SelectValue placeholder="Select field for student CV/file" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {formFields.map((field) => (
                      <SelectItem key={field.name} value={field.name}>
                        {field.label || field.name} ({field.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-student-linkedin-field">Student LinkedIn Field (Optional)</Label>
                <Select value={studentLinkedinField || "__none__"} onValueChange={(val) => setStudentLinkedinField(val === "__none__" ? "" : val)}>
                  <SelectTrigger id="edit-student-linkedin-field" className="w-full">
                    {studentLinkedinField && formFields.find(f => f.name === studentLinkedinField) ? (
                      <span className="block truncate">
                        {formFields.find(f => f.name === studentLinkedinField)?.label || formFields.find(f => f.name === studentLinkedinField)?.name} ({studentLinkedinField})
                      </span>
                    ) : (
                      <SelectValue placeholder="Select field for LinkedIn profile URL" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {formFields.map((field) => (
                      <SelectItem key={field.name} value={field.name}>
                        {field.label || field.name} ({field.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2 pt-4 border-t">
                <Checkbox
                  id="edit-backup-fields"
                  checked={backupFieldsEnabled}
                  onCheckedChange={(checked) => setBackupFieldsEnabled(checked === true)}
                />
                <Label htmlFor="edit-backup-fields" className="text-sm font-medium cursor-pointer">
                  Backup fields on
                </Label>
              </div>

              {backupFieldsEnabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="edit-student-first-name-field-backup">Student First Name Field Backup (Optional)</Label>
                    <Select value={studentFirstNameFieldBackup || undefined} onValueChange={(val) => setStudentFirstNameFieldBackup(val || "")}>
                      <SelectTrigger id="edit-student-first-name-field-backup" className="w-full">
                        {studentFirstNameFieldBackup && formFields.find(f => f.name === studentFirstNameFieldBackup) ? (
                          <span className="block truncate">
                            {formFields.find(f => f.name === studentFirstNameFieldBackup)?.label || formFields.find(f => f.name === studentFirstNameFieldBackup)?.name} ({studentFirstNameFieldBackup})
                          </span>
                        ) : (
                          <SelectValue placeholder="Select backup field for student first name" />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {formFields.map((field) => (
                          <SelectItem key={field.name} value={field.name}>
                            {field.label || field.name} ({field.name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-student-last-name-field-backup">Student Last Name Field Backup (Optional)</Label>
                    <Select value={studentLastNameFieldBackup || undefined} onValueChange={(val) => setStudentLastNameFieldBackup(val || "")}>
                      <SelectTrigger id="edit-student-last-name-field-backup" className="w-full">
                        {studentLastNameFieldBackup && formFields.find(f => f.name === studentLastNameFieldBackup) ? (
                          <span className="block truncate">
                            {formFields.find(f => f.name === studentLastNameFieldBackup)?.label || formFields.find(f => f.name === studentLastNameFieldBackup)?.name} ({studentLastNameFieldBackup})
                          </span>
                        ) : (
                          <SelectValue placeholder="Select backup field for student last name" />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {formFields.map((field) => (
                          <SelectItem key={field.name} value={field.name}>
                            {field.label || field.name} ({field.name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-student-email-field-backup">Student Email Field Backup (Optional)</Label>
                    <Select value={studentEmailFieldBackup || undefined} onValueChange={(val) => setStudentEmailFieldBackup(val || "")}>
                      <SelectTrigger id="edit-student-email-field-backup" className="w-full">
                        {studentEmailFieldBackup && formFields.find(f => f.name === studentEmailFieldBackup) ? (
                          <span className="block truncate">
                            {formFields.find(f => f.name === studentEmailFieldBackup)?.label || formFields.find(f => f.name === studentEmailFieldBackup)?.name} ({studentEmailFieldBackup})
                          </span>
                        ) : (
                          <SelectValue placeholder="Select backup field for student email" />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {formFields.map((field) => (
                          <SelectItem key={field.name} value={field.name}>
                            {field.label || field.name} ({field.name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-student-study-field-backup">Student Study Field Backup (Optional)</Label>
                    <Select value={studentStudyFieldBackup || undefined} onValueChange={(val) => setStudentStudyFieldBackup(val || "")}>
                      <SelectTrigger id="edit-student-study-field-backup" className="w-full">
                        {studentStudyFieldBackup && formFields.find(f => f.name === studentStudyFieldBackup) ? (
                          <span className="block truncate">
                            {formFields.find(f => f.name === studentStudyFieldBackup)?.label || formFields.find(f => f.name === studentStudyFieldBackup)?.name} ({studentStudyFieldBackup})
                          </span>
                        ) : (
                          <SelectValue placeholder="Select backup field for student study/program" />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {formFields.map((field) => (
                          <SelectItem key={field.name} value={field.name}>
                            {field.label || field.name} ({field.name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-student-cv-field-backup">Student CV Field Backup (Optional)</Label>
                    <Select value={studentCVFieldBackup || undefined} onValueChange={(val) => setStudentCVFieldBackup(val || "")}>
                      <SelectTrigger id="edit-student-cv-field-backup" className="w-full">
                        {studentCVFieldBackup && formFields.find(f => f.name === studentCVFieldBackup) ? (
                          <span className="block truncate">
                            {formFields.find(f => f.name === studentCVFieldBackup)?.label || formFields.find(f => f.name === studentCVFieldBackup)?.name} ({studentCVFieldBackup})
                          </span>
                        ) : (
                          <SelectValue placeholder="Select backup field for student CV/file" />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {formFields.map((field) => (
                          <SelectItem key={field.name} value={field.name}>
                            {field.label || field.name} ({field.name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-student-linkedin-field-backup">Student LinkedIn Field Backup (Optional)</Label>
                    <Select value={studentLinkedinFieldBackup || "__none__"} onValueChange={(val) => setStudentLinkedinFieldBackup(val === "__none__" ? "" : val)}>
                      <SelectTrigger id="edit-student-linkedin-field-backup" className="w-full">
                        {studentLinkedinFieldBackup && formFields.find(f => f.name === studentLinkedinFieldBackup) ? (
                          <span className="block truncate">
                            {formFields.find(f => f.name === studentLinkedinFieldBackup)?.label || formFields.find(f => f.name === studentLinkedinFieldBackup)?.name} ({studentLinkedinFieldBackup})
                          </span>
                        ) : (
                          <SelectValue placeholder="Select backup field for LinkedIn profile URL" />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {formFields.map((field) => (
                          <SelectItem key={field.name} value={field.name}>
                            {field.label || field.name} ({field.name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </>
          )}

          {formId && formFields.length === 0 && (
            <div className="text-sm text-muted-foreground">
              Loading form fields...
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !studentFirstNameField || !studentLastNameField || !studentEmailField || !studentStudyField || !studentCVField}>
              {loading ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

