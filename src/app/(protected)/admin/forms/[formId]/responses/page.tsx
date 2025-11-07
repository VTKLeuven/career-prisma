"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchFormByIdAction, fetchFormVersionsAction, fetchFormResponsesAction } from "@/app/actions/forms";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { ArrowLeft, Download, Eye } from "lucide-react";
import type { FormVersion, FormResponse } from "@/lib/schema";

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

    const fieldNames = selectedVersion.schema.fields.map(f => f.label || f.name);
    const fieldKeys = selectedVersion.schema.fields.map(f => f.name);

    const header = ['Submission Date', 'Response ID', ...fieldNames].join(',');

    const rows = responses.map(response => {
      const date = new Date(response.submitted_at).toLocaleString();
      const values = fieldKeys.map(key => {
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
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Submitted</TableHead>
                      {selectedVersion?.schema.fields.map((field) => (
                        <TableHead key={field.id}>{field.label || field.name}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {responses.map((response) => (
                      <TableRow key={response.id}>
                        <TableCell className="font-medium">
                          {new Date(response.submitted_at).toLocaleString()}
                        </TableCell>
                        {selectedVersion?.schema.fields.map((field) => (
                          <TableCell key={field.id}>
                            {formatFieldValue(response.data[field.name], field.type)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{responses.length}</div>
                    <div className="text-sm text-muted-foreground">Total Responses</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{selectedVersion?.schema.fields.length || 0}</div>
                    <div className="text-sm text-muted-foreground">Form Fields</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {responses.length > 0
                        ? new Date(responses[responses.length - 1].submitted_at).toLocaleDateString()
                        : "N/A"}
                    </div>
                    <div className="text-sm text-muted-foreground">Latest Response</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
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

    return (
      <a
        href={`/api/files/${value}`}
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

