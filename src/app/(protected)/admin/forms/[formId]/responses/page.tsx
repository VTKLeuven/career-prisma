"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchFormByIdAction, fetchFormVersionsAction, fetchFormResponsesAction, fetchFormResponsesTotalCountAction, fetchAllFormResponsesAction, fetchFirstFormResponseAction, fetchLatestFormResponseAction, deleteFormResponseAction, initializeAttendantUuidsAction } from "@/app/actions/forms";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Download, Eye, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, QrCode, Loader2 } from "lucide-react";
import type { FormVersion, FormResponse } from "@/lib/schema";
import { formatDateBE, formatDateTimeBE } from "@/lib/date-utils";
import * as XLSX from "xlsx";

export default function FormResponsesPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.formId as string;

  const [form, setForm] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [versions, setVersions] = useState<FormVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>("");
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [responseToDelete, setResponseToDelete] = useState<FormResponse | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [firstResponseDate, setFirstResponseDate] = useState<string | null>(null);
  const [latestResponseDate, setLatestResponseDate] = useState<string | null>(null);
  const [initializingUuids, setInitializingUuids] = useState(false);
  const pageSize = 25; // Constant page size

  const loadFormData = useCallback(async () => {
    setLoading(true);
    try {
      const [formData, versionsData] = await Promise.all([
        fetchFormByIdAction(formId),
        fetchFormVersionsAction(formId),
      ]);

      setForm({
        id: formData.id,
        name: formData.name,
        slug: formData.slug,
      });
      setVersions(versionsData);

      const activeVersion = versionsData.find(v => v.is_active);
      if (activeVersion) {
        setSelectedVersionId(activeVersion.id);
      } else if (versionsData.length > 0) {
        setSelectedVersionId(versionsData[0].id);
      }
    } catch (error) {
      console.error("Error loading form data:", error);
    } finally {
      setLoading(false);
    }
  }, [formId]);

  const loadResponses = useCallback(async (versionId: string, page: number = 1) => {
    setLoadingResponses(true);
    try {
      const [responsesData, total, firstResponse, latestResponse] = await Promise.all([
        fetchFormResponsesAction(versionId, { limit: 25, page }),
        fetchFormResponsesTotalCountAction(versionId),
        fetchFirstFormResponseAction(versionId),
        fetchLatestFormResponseAction(versionId),
      ]);
      setResponses(responsesData);
      setTotalCount(total);
      setFirstResponseDate(firstResponse?.submitted_at || null);
      setLatestResponseDate(latestResponse?.submitted_at || null);
    } catch (error) {
      console.error("Error loading responses:", error);
      setResponses([]);
      setTotalCount(0);
      setFirstResponseDate(null);
      setLatestResponseDate(null);
    } finally {
      setLoadingResponses(false);
    }
  }, []);

  useEffect(() => {
    loadFormData();
  }, [loadFormData]);

  // Reset to page 1 when version changes
  useEffect(() => {
    if (selectedVersionId) {
      setCurrentPage(1);
    }
  }, [selectedVersionId]);

  // Load responses when version or page changes
  useEffect(() => {
    if (selectedVersionId) {
      loadResponses(selectedVersionId, currentPage);
    }
  }, [currentPage, selectedVersionId, loadResponses]);

  const exportToXLSX = async () => {
    if (!selectedVersionId) return;

    const selectedVersion = versions.find(v => v.id === selectedVersionId);
    if (!selectedVersion) return;

    // Fetch all responses for export
    let allResponses: FormResponse[];
    try {
      allResponses = await fetchAllFormResponsesAction(selectedVersionId);
    } catch (error) {
      console.error("Error fetching all responses for export:", error);
      alert("Failed to fetch all responses. Please try again.");
      return;
    }

    if (allResponses.length === 0) {
      alert("No responses to export.");
      return;
    }

    // Check if both firstname and lastname fields exist
    const hasFirstNameField = selectedVersion.schema.fields.some(f => f.name === 'firstname');
    const hasLastNameField = selectedVersion.schema.fields.some(f => f.name === 'lastname');
    const shouldCombineName = hasFirstNameField && hasLastNameField;

    // Build field names and keys, combining firstname and lastname if both exist
    const fieldNames: string[] = [];
    const fieldKeys: string[] = [];

    selectedVersion.schema.fields.forEach(field => {
      if (shouldCombineName && field.name === 'lastname') {
        // Skip lastname - it will be combined with firstname
        return;
      }
      if (shouldCombineName && field.name === 'firstname') {
        // Replace "firstname" with combined "Name" label
        fieldNames.push('Name');
        fieldKeys.push('firstname');
      } else {
        fieldNames.push(field.label || field.name);
        fieldKeys.push(field.name);
      }
    });

    // Check if this is an event registration form (has attendant_uuid)
    const isEventRegistration = allResponses.some(r => r.attendant_uuid);
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

    // Prepare data for XLSX
    const headerRow = ['Submission Date', 'Response ID', ...fieldNames, ...(isEventRegistration ? ['Attendant Link'] : [])];
    
    const dataRows = allResponses.map(response => {
      const date = formatDateTimeBE(response.submitted_at);
      const values = fieldKeys.map(key => {
        if (shouldCombineName && key === 'firstname') {
          // Combine firstname and lastname
          const firstName = response.data['firstname'] || '';
          const lastName = response.data['lastname'] || '';
          const fullName = `${firstName} ${lastName}`.trim();
          return fullName;
        }
        const value = response.data[key];
        if (value === null || value === undefined) return '';
        if (Array.isArray(value)) return value.join('; ');
        return String(value);
      });
      
      // Add attendant link if UUID exists
      const attendantLink = response.attendant_uuid 
        ? `${baseUrl}/attendant/${response.attendant_uuid}`
        : '';
      
      return [date, response.id, ...values, ...(isEventRegistration ? [attendantLink] : [])];
    });

    // Create worksheet
    const worksheetData = [headerRow, ...dataRows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Create workbook and add worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Responses');

    // Generate XLSX file
    const xlsxBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    const blob = new Blob([xlsxBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${form?.slug}-responses-${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDeleteClick = (response: FormResponse) => {
    setResponseToDelete(response);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!responseToDelete) return;

    setDeleting(true);
    try {
      await deleteFormResponseAction(responseToDelete.id);
      // Remove the deleted response from the list and update count
      setResponses(responses.filter(r => r.id !== responseToDelete.id));
      setTotalCount(prev => Math.max(0, prev - 1));
      setDeleteDialogOpen(false);
      setResponseToDelete(null);
    } catch (error) {
      console.error("Error deleting response:", error);
      alert("Failed to delete response. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const handleInitializeUuids = async () => {
    if (!form) return;
    
    const isEventRegistration = selectedVersion?.metadata?.is_event_registration;
    if (!isEventRegistration) {
      alert("This form is not an event registration form. UUIDs are only needed for event registration forms.");
      return;
    }

    if (!confirm(`Initialize UUIDs for all responses in "${form.name}"? This will generate QR code links for existing responses.`)) {
      return;
    }

    setInitializingUuids(true);
    try {
      const result = await initializeAttendantUuidsAction(form.id);
      if (result.success) {
        alert(result.message);
        // Reload responses to show updated data
        if (selectedVersionId) {
          await loadResponses(selectedVersionId, currentPage);
        }
      } else {
        alert(`Failed: ${result.message}`);
      }
    } catch (error) {
      console.error("Error initializing UUIDs:", error);
      alert("Failed to initialize UUIDs. Please try again.");
    } finally {
      setInitializingUuids(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="text-center py-12">Loading...</div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold mb-2">Form Not Found</h2>
              <p className="text-muted-foreground mb-4">The form you&apos;re looking for doesn&apos;t exist.</p>
              <Button onClick={() => router.push("/admin/forms")}>Back to Forms</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedVersion = versions.find(v => v.id === selectedVersionId);

  return (
    <div className="container mx-auto p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/forms">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Forms
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{form.name} - Responses</h1>
          <p className="text-muted-foreground">View and export form submissions</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Form Responses</CardTitle>
              <CardDescription>
                {totalCount} response(s) {selectedVersion && `for version ${selectedVersion.version_number}`}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={selectedVersionId} onValueChange={setSelectedVersionId}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select version" />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((version) => (
                    <SelectItem key={version.id} value={version.id}>
                      Version {version.version_number}
                      {version.is_active && " (Active)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedVersion?.metadata?.is_event_registration && (
                <Button 
                  variant="outline" 
                  onClick={handleInitializeUuids} 
                  disabled={initializingUuids || totalCount === 0}
                  title="Initialize UUIDs for existing responses to enable QR codes"
                >
                  {initializingUuids ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Initializing...
                    </>
                  ) : (
                    <>
                      <QrCode className="h-4 w-4 mr-2" />
                      Initialize UUIDs
                    </>
                  )}
                </Button>
              )}
              <Button variant="outline" onClick={exportToXLSX} disabled={totalCount === 0}>
                <Download className="h-4 w-4 mr-2" />
                Export XLSX
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingResponses ? (
            <div className="text-center py-8">Loading responses...</div>
          ) : responses.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No responses yet for this version.</p>
              <Button variant="outline" asChild>
                <Link href={`/forms/${form.slug}`} target="_blank">
                  <Eye className="h-4 w-4 mr-2" />
                  View Public Form
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="py-3">
                  <CardContent>
                    <div className="text-2xl font-bold">{totalCount}</div>
                    <div className="text-sm text-muted-foreground">Total Responses</div>
                  </CardContent>
                </Card>
                <Card className="py-3">
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {firstResponseDate ? formatDateBE(firstResponseDate) : "N/A"}
                    </div>
                    <div className="text-sm text-muted-foreground">First Response</div>
                  </CardContent>
                </Card>
                <Card className="py-3">
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {latestResponseDate ? formatDateBE(latestResponseDate) : "N/A"}
                    </div>
                    <div className="text-sm text-muted-foreground">Latest Response</div>
                  </CardContent>
                </Card>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Submitted</TableHead>
                      {selectedVersion?.schema.fields.map((field) => (
                        <TableHead key={field.id}>{field.label || field.name}</TableHead>
                      ))}
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {responses.map((response) => (
                      <TableRow key={response.id}>
                        <TableCell className="font-medium">
                          {formatDateTimeBE(response.submitted_at)}
                        </TableCell>
                        {selectedVersion?.schema.fields.map((field) => (
                          <TableCell key={field.id}>
                            {formatFieldValue(response.data[field.name], field.type)}
                          </TableCell>
                        ))}
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(response)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              {totalCount > pageSize && (
                <div className="flex items-center justify-between border-t pt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} responses
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1 || loadingResponses}
                      title="First page"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1 || loadingResponses}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <div className="text-sm text-muted-foreground">
                      Page {currentPage} of {Math.ceil(totalCount / pageSize)}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalCount / pageSize), prev + 1))}
                      disabled={currentPage >= Math.ceil(totalCount / pageSize) || loadingResponses}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.ceil(totalCount / pageSize))}
                      disabled={currentPage >= Math.ceil(totalCount / pageSize) || loadingResponses}
                      title="Last page"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Submission</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this submission? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {responseToDelete && (
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                <strong>Submitted:</strong> {formatDateTimeBE(responseToDelete.submitted_at)}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setResponseToDelete(null);
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatFieldValue(value: unknown, fieldType: string): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic">-</span>;
  }

  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1">
        {value.map((v, idx) => (
          <Badge key={idx} variant="secondary">{String(v)}</Badge>
        ))}
      </div>
    );
  }

  if (fieldType === "checkbox" || fieldType === "radio") {
    return <Badge variant="secondary">{String(value)}</Badge>;
  }

  if (fieldType === "file") {
    if (!value) return <span className="text-muted-foreground italic">-</span>;

    // Handle both file ID (string) and file object
    let fileId: string;
    if (typeof value === 'string') {
      fileId = value;
    } else if (typeof value === 'object' && value !== null) {
      // If it's an object, try to get the id property
      fileId = (value as { id?: string }).id || String(value);
    } else {
      console.error('Unexpected file value type:', typeof value, value);
      return <span className="text-muted-foreground">Invalid file data</span>;
    }

    return (
      <a
        href={`/api/files/${fileId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline flex items-center gap-1"
      >
        <Download className="h-3 w-3" />
        View/Download File
      </a>
    );
  }

  const strValue = String(value);
  if (strValue.length > 50) {
    return <span className="text-sm" title={strValue}>{strValue.substring(0, 50)}...</span>;
  }

  return <span>{strValue}</span>;
}

