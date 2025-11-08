"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchFormByIdAction, fetchFormVersionsAction, fetchFormResponsesAction, deleteFormResponseAction } from "@/app/actions/forms";
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
import { ArrowLeft, Download, Eye, Trash2 } from "lucide-react";
import type { FormVersion, FormResponse } from "@/lib/schema";
import { formatDateBE, formatDateTimeBE } from "@/lib/date-utils";

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

  const loadResponses = useCallback(async (versionId: string) => {
    setLoadingResponses(true);
    try {
      const responsesData = await fetchFormResponsesAction(versionId);
      setResponses(responsesData);
    } catch (error) {
      console.error("Error loading responses:", error);
      setResponses([]);
    } finally {
      setLoadingResponses(false);
    }
  }, []);

  useEffect(() => {
    loadFormData();
  }, [loadFormData]);

  useEffect(() => {
    if (selectedVersionId) {
      loadResponses(selectedVersionId);
    }
  }, [selectedVersionId, loadResponses]);

  const exportToCSV = () => {
    if (responses.length === 0 || !selectedVersionId) return;

    const selectedVersion = versions.find(v => v.id === selectedVersionId);
    if (!selectedVersion) return;

    // Check if both name and surname fields exist
    const hasNameField = selectedVersion.schema.fields.some(f => f.name === 'name');
    const hasSurnameField = selectedVersion.schema.fields.some(f => f.name === 'surname');
    const shouldCombineName = hasNameField && hasSurnameField;

    // Build field names and keys, combining name and surname if both exist
    const fieldNames: string[] = [];
    const fieldKeys: string[] = [];

    selectedVersion.schema.fields.forEach(field => {
      if (shouldCombineName && field.name === 'surname') {
        // Skip surname - it will be combined with name
        return;
      }
      if (shouldCombineName && field.name === 'name') {
        // Replace "name" with combined "name" label
        fieldNames.push('Name');
        fieldKeys.push('name');
      } else {
        fieldNames.push(field.label || field.name);
        fieldKeys.push(field.name);
      }
    });

    const header = ['Submission Date', 'Response ID', ...fieldNames].join(',');

    const rows = responses.map(response => {
      const date = formatDateTimeBE(response.submitted_at);
      const values = fieldKeys.map(key => {
        if (shouldCombineName && key === 'name') {
          // Combine name and surname
          const firstName = response.data['name'] || '';
          const surname = response.data['surname'] || '';
          const fullName = `${firstName} ${surname}`.trim();
          return fullName.replace(/"/g, '""');
        }
        const value = response.data[key];
        if (value === null || value === undefined) return '';
        if (Array.isArray(value)) return value.join('; ');
        return String(value).replace(/"/g, '""');
      });
      return [date, response.id, ...values].map(v => `"${v}"`).join(',');
    });

    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${form?.slug}-responses-${new Date().toISOString().split('T')[0]}.csv`;
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
      // Remove the deleted response from the list
      setResponses(responses.filter(r => r.id !== responseToDelete.id));
      setDeleteDialogOpen(false);
      setResponseToDelete(null);
    } catch (error) {
      console.error("Error deleting response:", error);
      alert("Failed to delete response. Please try again.");
    } finally {
      setDeleting(false);
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
                {responses.length} response(s) {selectedVersion && `for version ${selectedVersion.version_number}`}
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
              <Button variant="outline" onClick={exportToCSV} disabled={responses.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
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
                    <div className="text-2xl font-bold">{responses.length}</div>
                    <div className="text-sm text-muted-foreground">Total Responses</div>
                  </CardContent>
                </Card>
                <Card className="py-3">
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {responses.length > 0
                        ? formatDateBE(responses[responses.length - 1].submitted_at)
                        : "N/A"}
                    </div>
                    <div className="text-sm text-muted-foreground">First Response</div>
                  </CardContent>
                </Card>
                <Card className="py-3">
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {responses.length > 0
                        ? formatDateBE(responses[0].submitted_at)
                        : "N/A"}
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

