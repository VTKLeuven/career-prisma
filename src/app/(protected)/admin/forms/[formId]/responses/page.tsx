"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchFormByIdAction, fetchFormVersionsAction, fetchFormResponsesAction, fetchFormResponsesTotalCountAction, fetchAllFormResponsesAction, fetchFirstFormResponseAction, fetchLatestFormResponseAction, deleteFormResponseAction, updateFormResponseAction, initializeAttendantUuidsAction, archiveDuplicateFormResponsesAction, fetchFormResponsesForAllVersionsAction, fetchFormResponsesTotalCountForAllVersionsAction, fetchFirstFormResponseForAllVersionsAction, fetchLatestFormResponseForAllVersionsAction, fetchAllFormResponsesForAllVersionsAction, updateFormVersionAction } from "@/app/actions/forms";
import { fetchCompaniesForEventAction } from "@/app/actions/companies";
import { fetchMastersAction, fetchFacultiesAction } from "@/app/actions/features";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ArrowLeft, Download, Eye, Trash2, Pencil, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, QrCode, Loader2, Mail, ArrowUpDown, ArrowUp, ArrowDown, Check, X, FileArchive, Archive, Scan } from "lucide-react";
import type { FormVersion, FormResponse, FormField } from "@/lib/schema";
import { formatDateBE, formatDateTimeBE } from "@/lib/date-utils";
import { CSV_UTF8_BOM } from "@/lib/utils/slugify";
import { FormFieldRenderer } from "@/components/FormFieldRenderer";
import { getDirectusImageUrl } from "@/components/Images";
import NextImage from "next/image";
import { resolveMasterDegreeValueToDisplayLabel, normalizeFaculties, type FacultyItem } from "@/lib/utils/master-degree-options";
import type { Master } from "@/lib/schema";

export default function FormResponsesPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.formId as string;

  const [form, setForm] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [versions, setVersions] = useState<FormVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>("");
  const [isAllVersions, setIsAllVersions] = useState(true); // Default to all versions
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [allVersionsFields, setAllVersionsFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [responseToDelete, setResponseToDelete] = useState<FormResponse | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [responseToEdit, setResponseToEdit] = useState<FormResponse | null>(null);
  const [editFormData, setEditFormData] = useState<Record<string, unknown>>({});
  const [editSubmitterInfo, setEditSubmitterInfo] = useState<{ first_name: string; last_name: string; email: string }>({ first_name: "", last_name: "", email: "" });
  const [editing, setEditing] = useState(false);
  const [editingField, setEditingField] = useState<{ responseId: string; fieldName: string } | null>(null);
  const [editingFieldValue, setEditingFieldValue] = useState("");
  const [savingField, setSavingField] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [firstResponseDate, setFirstResponseDate] = useState<string | null>(null);
  const [latestResponseDate, setLatestResponseDate] = useState<string | null>(null);
  const [initializingUuids, setInitializingUuids] = useState(false);
  const [archivingDuplicates, setArchivingDuplicates] = useState(false);
  const [mastersForDisplay, setMastersForDisplay] = useState<Master[]>([]);
  const [facultiesForDisplay, setFacultiesForDisplay] = useState<FacultyItem[]>([]);
  const [viewMode, setViewMode] = useState<"submissions" | "incomplete">("submissions");
  const [incompleteCompanies, setIncompleteCompanies] = useState<Array<{ id: string; name: string; salesperson: string; optionName: string }>>([]);
  const [loadingIncompleteCompanies, setLoadingIncompleteCompanies] = useState(false);
  const [incompleteSortField, setIncompleteSortField] = useState<"name" | "salesperson" | "optionName">("name");
  const [incompleteSortDirection, setIncompleteSortDirection] = useState<"asc" | "desc">("asc");
  const [submissionsSortField, setSubmissionsSortField] = useState<"submitted_at" | "company_name">("submitted_at");
  const [submissionsSortDirection, setSubmissionsSortDirection] = useState<"asc" | "desc">("desc");
  const [companyCompletionStats, setCompanyCompletionStats] = useState<{ completed: number; incomplete: number } | null>(null);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [reminderSubject, setReminderSubject] = useState("");
  const [reminderContent, setReminderContent] = useState("");
  const [reminderRecipients, setReminderRecipients] = useState<Array<{
    companyId: string;
    companyName: string;
    representatives: Array<{
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      selected: boolean;
    }>;
  }>>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [reminderJobId, setReminderJobId] = useState<string | null>(null);
  const [reminderJobStatus, setReminderJobStatus] = useState<{
    status: string;
    sent: number;
    failed: number;
    skipped: number;
    total: number;
    errors: string[];
    completedAt?: number;
  } | null>(null);
  const [downloadingAllFiles, setDownloadingAllFiles] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [sendingQrEmails, setSendingQrEmails] = useState(false);
  const [qrEmailStats, setQrEmailStats] = useState<{ total: number; sent: number; unsent: number } | null>(null);
  const [loadingQrStats, setLoadingQrStats] = useState(false);
  const [qrSendOnlyUnsent, setQrSendOnlyUnsent] = useState(true);
  const [qrJobId, setQrJobId] = useState<string | null>(null);
  const [qrJobStatus, setQrJobStatus] = useState<{
    status: string;
    sent: number;
    failed: number;
    skipped: number;
    total: number;
    errors: string[];
    completedAt?: number;
  } | null>(null);
  const [scanningColumnsDialogOpen, setScanningColumnsDialogOpen] = useState(false);
  const [scanningColumns, setScanningColumns] = useState<{
    university?: string;
    faculty?: string;
    master?: string;
    year_of_study?: string;
  }>({});
  const [savingScanningColumns, setSavingScanningColumns] = useState(false);
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

      // Set default version for fallback, but keep all versions mode as default
      const activeVersion = versionsData.find(v => v.is_active);
      if (activeVersion) {
        setSelectedVersionId(activeVersion.id);
      } else if (versionsData.length > 0) {
        setSelectedVersionId(versionsData[0].id);
      }
      // Keep isAllVersions as true (default)
    } catch (error) {
      console.error("Error loading form data:", error);
    } finally {
      setLoading(false);
    }
  }, [formId]);

  const loadResponses = useCallback(async (versionId: string | null, page: number = 1, allVersions: boolean = false) => {
    setLoadingResponses(true);
    try {
      if (allVersions && formId) {
        const [responsesData, total, firstResponse, latestResponse] = await Promise.all([
          fetchFormResponsesForAllVersionsAction(formId, { limit: 25, page }),
          fetchFormResponsesTotalCountForAllVersionsAction(formId),
          fetchFirstFormResponseForAllVersionsAction(formId),
          fetchLatestFormResponseForAllVersionsAction(formId),
        ]);
        setResponses(responsesData);
        setTotalCount(total);
        setFirstResponseDate(firstResponse?.submitted_at || null);
        setLatestResponseDate(latestResponse?.submitted_at || null);
      } else if (versionId) {
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
      }
    } catch (error) {
      console.error("Error loading responses:", error);
      setResponses([]);
      setTotalCount(0);
      setFirstResponseDate(null);
      setLatestResponseDate(null);
    } finally {
      setLoadingResponses(false);
    }
  }, [formId]);

  useEffect(() => {
    loadFormData();
  }, [loadFormData]);

  // Collect all unique fields from all versions (prefer newest version so master-degrees wins over old checkbox)
  useEffect(() => {
    if (versions.length > 0 && responses.length > 0) {
      const fieldMap = new Map<string, FormField>();
      const sortedVersions = [...versions].sort((a, b) => (b.version_number ?? 0) - (a.version_number ?? 0));
      sortedVersions.forEach(version => {
        if (version.schema?.fields) {
          version.schema.fields.forEach((field: FormField) => {
            if (!fieldMap.has(field.name)) {
              fieldMap.set(field.name, { ...field, label: field.label || field.name });
            }
          });
        }
      });

      // Filter out fields that have no responses (all values are null/undefined/NA)
      const fieldsWithData = Array.from(fieldMap.values()).filter(field => {
        return responses.some(response => {
          const value = response.data?.[field.name];
          return value !== null && value !== undefined && value !== '';
        });
      });

      setAllVersionsFields(fieldsWithData);
    } else if (versions.length > 0) {
      // If no responses yet, show all fields (newest version first so master-degrees wins)
      const fieldMap = new Map<string, FormField>();
      const sortedVersions = [...versions].sort((a, b) => (b.version_number ?? 0) - (a.version_number ?? 0));
      sortedVersions.forEach(version => {
        if (version.schema?.fields) {
          version.schema.fields.forEach((field: FormField) => {
            if (!fieldMap.has(field.name)) {
              fieldMap.set(field.name, { ...field, label: field.label || field.name });
            }
          });
        }
      });
      setAllVersionsFields(Array.from(fieldMap.values()));
    }
  }, [versions, responses]);

  // Reset to page 1 when version changes
  useEffect(() => {
    if (selectedVersionId || isAllVersions) {
      setCurrentPage(1);
    }
  }, [selectedVersionId, isAllVersions]);

  // Load responses when version or page changes
  useEffect(() => {
    if (isAllVersions) {
      loadResponses(null, currentPage, true);
    } else if (selectedVersionId) {
      loadResponses(selectedVersionId, currentPage, false);
    }
  }, [currentPage, selectedVersionId, isAllVersions, loadResponses]);

  // Load masters and faculties for master-degrees display labels
  useEffect(() => {
    const hasMasterDegrees = versions.some((v) =>
      v.schema?.fields?.some((f) => f.type === "master-degrees")
    );
    if (!hasMasterDegrees) {
      setMastersForDisplay([]);
      setFacultiesForDisplay([]);
      return;
    }
    Promise.all([fetchMastersAction(), fetchFacultiesAction()]).then(([masters, rawFaculties]) => {
      setMastersForDisplay(masters ?? []);
      setFacultiesForDisplay(normalizeFaculties(rawFaculties ?? []) ?? []);
    });
  }, [versions]);

  // Load company completion stats for company forms
  useEffect(() => {
    async function loadCompanyStats() {
      if (versions.length === 0) {
        setCompanyCompletionStats(null);
        return;
      }

      // In all versions mode, find any company form version
      // In single version mode, use the selected version
      let version: FormVersion | undefined;
      if (isAllVersions) {
        version = versions.find(v => {
          const metadata = v.metadata as any;
          return metadata?.is_company_form && metadata?.event_id;
        });
      } else {
        if (!selectedVersionId) {
          setCompanyCompletionStats(null);
          return;
        }
        version = versions.find(v => v.id === selectedVersionId);
      }

      if (!version) {
        setCompanyCompletionStats(null);
        return;
      }

      const metadata = version.metadata as any;
      if (!metadata?.is_company_form || !metadata?.event_id) {
        setCompanyCompletionStats(null);
        return;
      }

      try {
        console.log('[FormResponsesPage] Loading company stats:', {
          eventId: metadata.event_id,
          optionIds: metadata.option_ids,
        });

        // Get all companies for this event
        const companies = await fetchCompaniesForEventAction(metadata.event_id, false);
        console.log('[FormResponsesPage] Fetched companies:', companies?.length || 0, companies);
        
        if (!companies || companies.length === 0) {
          console.log('[FormResponsesPage] No companies found for event');
          setCompanyCompletionStats({ completed: 0, incomplete: 0 });
          return;
        }

        // Get company option IDs for filtering
        const requiredOptionIds = metadata.option_ids || [];
        console.log('[FormResponsesPage] Required option IDs:', requiredOptionIds);
        
        // Filter companies that have the required options (or all if no options required)
        const eligibleCompanies = companies.filter((company) => {
          if (requiredOptionIds.length === 0) {
            console.log('[FormResponsesPage] No required options, company eligible:', company.name);
            return true;
          }
          
          // Extract company option IDs
          const companyOptionIds = company.options
            ?.map((opt) => {
              if (typeof opt === 'string') return opt;
              if (opt && typeof opt === 'object') {
                if ('career_event_option_id' in opt) {
                  const optionRef = (opt as any).career_event_option_id;
                  if (typeof optionRef === 'string') return optionRef;
                  if (optionRef && typeof optionRef === 'object' && 'id' in optionRef) {
                    return optionRef.id;
                  }
                }
                if ('id' in opt) return opt.id;
              }
              return null;
            })
            .filter((id): id is string => id !== null) || [];
          
          console.log('[FormResponsesPage] Company options:', {
            companyName: company.name,
            companyOptionIds,
            requiredOptionIds,
            hasMatch: requiredOptionIds.some((optionId: string) => companyOptionIds.includes(optionId)),
          });
          
          return requiredOptionIds.some((optionId: string) => companyOptionIds.includes(optionId));
        });

        console.log('[FormResponsesPage] Eligible companies:', eligibleCompanies.length, eligibleCompanies.map(c => c.name));

        // Get all responses for this version (or all versions) to find which companies submitted
        let allResponses: FormResponse[];
        if (isAllVersions) {
          allResponses = await fetchAllFormResponsesForAllVersionsAction(formId);
        } else {
          allResponses = await fetchAllFormResponsesAction(selectedVersionId);
        }
        
        // Get unique company IDs that have submitted
        const completedCompanyIds = new Set<string>();
        allResponses.forEach((response) => {
          if (response.company_id) {
            // Handle both string ID and Company object
            const companyId = typeof response.company_id === 'string' 
              ? response.company_id 
              : (response.company_id as any)?.id;
            if (companyId) {
              completedCompanyIds.add(String(companyId));
            }
          }
        });

        // Get eligible company IDs as strings for comparison
        const eligibleCompanyIds = new Set<string>(
          eligibleCompanies.map(c => String(c.id))
        );

        console.log('[FormResponsesPage] Completed company IDs:', Array.from(completedCompanyIds));
        console.log('[FormResponsesPage] Eligible company IDs:', Array.from(eligibleCompanyIds));

        // Count completed: unique companies that have submitted
        const completed = completedCompanyIds.size;
        
        // Count incomplete: eligible companies that haven't submitted
        // Filter eligible companies to only those that haven't submitted
        const incompleteCompanyIds = eligibleCompanies
          .map(c => String(c.id))
          .filter(id => !completedCompanyIds.has(id));
        const incomplete = incompleteCompanyIds.length;

        console.log('[FormResponsesPage] Stats:', { completed, incomplete, totalEligible: eligibleCompanies.length });

        setCompanyCompletionStats({ completed, incomplete });
      } catch (error) {
        console.error("Error loading company completion stats:", error);
        setCompanyCompletionStats(null);
      }
    }

    loadCompanyStats();
  }, [selectedVersionId, versions, responses.length, isAllVersions, formId]); // Reload stats when responses change

  // Load incomplete companies when dialog opens
  const loadIncompleteCompanies = async () => {
    if (versions.length === 0) return;
    
    // In all versions mode, find any company form version
    // In single version mode, use the selected version
    let version: FormVersion | undefined;
    if (isAllVersions) {
      version = versions.find(v => {
        const metadata = v.metadata as any;
        return metadata?.is_company_form && metadata?.event_id;
      });
    } else {
      if (!selectedVersionId) return;
      version = versions.find(v => v.id === selectedVersionId);
    }
    
    if (!version) return;
    
    const metadata = version.metadata as any;
    if (!metadata?.is_company_form || !metadata?.event_id) return;

    setLoadingIncompleteCompanies(true);
    try {
      // Get all companies for this event
      const companies = await fetchCompaniesForEventAction(metadata.event_id, false);
      if (!companies || companies.length === 0) {
        setIncompleteCompanies([]);
        setLoadingIncompleteCompanies(false);
        return;
      }

      // Get company option IDs for filtering
      const requiredOptionIds = metadata.option_ids || [];
      
      // Filter companies that have the required options (or all if no options required)
      const eligibleCompanies = companies.filter((company) => {
        if (requiredOptionIds.length === 0) return true;
        
        // Extract company option IDs
        const companyOptionIds = company.options
          ?.map((opt) => {
            if (typeof opt === 'string') return opt;
            if (opt && typeof opt === 'object') {
              if ('career_event_option_id' in opt) {
                const optionRef = (opt as any).career_event_option_id;
                if (typeof optionRef === 'string') return optionRef;
                if (optionRef && typeof optionRef === 'object' && 'id' in optionRef) {
                  return optionRef.id;
                }
              }
              if ('id' in opt) return opt.id;
            }
            return null;
          })
          .filter((id): id is string => id !== null) || [];
        
        return requiredOptionIds.some((optionId: string) => companyOptionIds.includes(optionId));
      });

      // Get all responses to find which companies have submitted
      let allResponses: FormResponse[];
      if (isAllVersions) {
        allResponses = await fetchAllFormResponsesForAllVersionsAction(formId);
      } else {
        allResponses = await fetchAllFormResponsesAction(selectedVersionId);
      }
      const completedCompanyIds = new Set<string>();
      allResponses.forEach((response) => {
        if (response.company_id) {
          // Handle both string ID and Company object
          const companyId = typeof response.company_id === 'string' 
            ? response.company_id 
            : (response.company_id as any)?.id;
          if (companyId) {
            completedCompanyIds.add(String(companyId));
          }
        }
      });

      console.log('[FormResponsesPage] Completed company IDs (incomplete list):', Array.from(completedCompanyIds));
      console.log('[FormResponsesPage] Eligible company IDs (incomplete list):', eligibleCompanies.map(c => String(c.id)));

      // Filter to only incomplete companies
      const incomplete = eligibleCompanies
        .filter((company) => {
          const companyIdStr = String(company.id);
          const isCompleted = completedCompanyIds.has(companyIdStr);
          console.log('[FormResponsesPage] Company check:', { 
            companyName: company.name, 
            companyId: companyIdStr, 
            isCompleted,
            inSet: completedCompanyIds.has(companyIdStr)
          });
          return !isCompleted;
        })
        .map((company) => {
          const salesperson = company.salesperson
            ? typeof company.salesperson === 'object' && company.salesperson !== null
              ? `${(company.salesperson as any).first_name || ''} ${(company.salesperson as any).last_name || ''}`.trim() || 'No salesperson'
              : String(company.salesperson)
            : 'No salesperson';
          
          // Get the option name(s) that match the required options
          const companyOptionNames: string[] = [];
          if (requiredOptionIds.length > 0) {
            company.options?.forEach((opt) => {
              let optionId: string | null = null;
              let optionName: string | null = null;
              
              if (typeof opt === 'string') {
                optionId = opt;
              } else if (opt && typeof opt === 'object') {
                if ('career_event_option_id' in opt) {
                  const optionRef = (opt as any).career_event_option_id;
                  if (typeof optionRef === 'string') {
                    optionId = optionRef;
                  } else if (optionRef && typeof optionRef === 'object' && 'id' in optionRef) {
                    optionId = optionRef.id;
                    optionName = optionRef.name || null;
                  }
                } else if ('id' in opt) {
                  optionId = opt.id;
                  optionName = (opt as any).name || null;
                }
              }
              
              if (optionId && requiredOptionIds.includes(optionId)) {
                if (optionName) {
                  companyOptionNames.push(optionName);
                } else {
                  // Fallback: use option ID if name not available
                  companyOptionNames.push(optionId);
                }
              }
            });
          } else {
            // If no required options, show all options the company has
            company.options?.forEach((opt) => {
              let optionName: string | null = null;
              
              if (opt && typeof opt === 'object') {
                if ('career_event_option_id' in opt) {
                  const optionRef = (opt as any).career_event_option_id;
                  if (optionRef && typeof optionRef === 'object' && 'name' in optionRef) {
                    optionName = optionRef.name || null;
                  }
                } else if ('name' in opt) {
                  optionName = (opt as any).name || null;
                }
              }
              
              if (optionName) {
                companyOptionNames.push(optionName);
              }
            });
          }
          
          return {
            id: company.id,
            name: company.name,
            salesperson,
            optionName: companyOptionNames.length > 0 ? companyOptionNames.join(', ') : 'N/A',
          };
        });

      setIncompleteCompanies(incomplete);
    } catch (error) {
      console.error("Error loading incomplete companies:", error);
      setIncompleteCompanies([]);
    } finally {
      setLoadingIncompleteCompanies(false);
    }
  };

  // Load incomplete companies when switching to incomplete view
  useEffect(() => {
    if (viewMode === "incomplete" && selectedVersionId && versions.length > 0 && incompleteCompanies.length === 0) {
      loadIncompleteCompanies();
    }
  }, [viewMode, selectedVersionId, versions]);

  const loadReminderRecipients = async () => {
    if (!form || incompleteCompanies.length === 0) return;

    setLoadingRecipients(true);
    try {
      const response = await fetch(`/api/admin/forms/${formId}/reminder-recipients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyIds: incompleteCompanies.map(c => c.id),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to load recipients');
      }

      const data = await response.json();
      setReminderRecipients(data.recipients || []);
      
      // Set default subject and content
      if (!reminderSubject) {
        setReminderSubject(`Reminder: Please Complete ${form.name}`);
      }
      if (!reminderContent) {
        setReminderContent(`Dear {name},\n\nThis is a reminder that your company {company} still needs to complete the form ${form.name}.\n\nPlease complete the form by clicking the link below:\n\n{form_link}\n\nIf you have any questions, please don't hesitate to contact us.\n\nBest regards,\nThe VTK Career Team`);
      }
    } catch (error) {
      console.error("Error loading recipients:", error);
      alert(`Failed to load recipients: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoadingRecipients(false);
    }
  };

  const handleOpenReminderDialog = () => {
    setReminderDialogOpen(true);
    loadReminderRecipients();
  };

  const loadQrEmailStats = async () => {
    setLoadingQrStats(true);
    try {
      const versionToUse = isAllVersions
        ? versions.find(v => v.metadata?.is_event_registration)
        : versions.find(v => v.id === selectedVersionId);

      if (!versionToUse) return;

      const allResponses = isAllVersions
        ? await fetchAllFormResponsesForAllVersionsAction(formId)
        : await fetchAllFormResponsesAction(versionToUse.id);

      const withUuid = allResponses.filter((r: FormResponse) => r.attendant_uuid && !r.archived);
      const sentCount = withUuid.filter((r: FormResponse) => r.data?._qr_email_sent_at).length;
      setQrEmailStats({
        total: withUuid.length,
        sent: sentCount,
        unsent: withUuid.length - sentCount,
      });
    } catch (error) {
      console.error("Error loading QR email stats:", error);
    } finally {
      setLoadingQrStats(false);
    }
  };

  const handleOpenQrDialog = async () => {
    setQrDialogOpen(true);
    setQrSendOnlyUnsent(true);
    setQrJobId(null);
    setQrJobStatus(null);
    await loadQrEmailStats();
  };

  // Poll job status while a QR email job is active
  useEffect(() => {
    if (!qrJobId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/admin/forms/${formId}/email-job-status?jobId=${encodeURIComponent(qrJobId)}`
        );
        if (!res.ok) return;
        const { job } = await res.json();
        if (cancelled) return;
        setQrJobStatus(job);

        if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
          setSendingQrEmails(false);
          // Refresh stats so the dialog shows updated sent/unsent counts
          loadQrEmailStats();
          if (selectedVersionId || isAllVersions) {
            loadResponses(selectedVersionId || null, currentPage, isAllVersions);
          }
        }
      } catch {
        // Polling failure is non-fatal
      }
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrJobId, formId]);

  const handleSendQrEmails = async () => {
    if (!form) return;

    const versionToUse = isAllVersions
      ? versions.find(v => v.metadata?.is_event_registration)
      : versions.find(v => v.id === selectedVersionId);

    if (!versionToUse) return;

    const targetCount = qrSendOnlyUnsent
      ? (qrEmailStats?.unsent ?? 0)
      : (qrEmailStats?.total ?? 0);
    if (targetCount === 0) {
      alert("No attendees to send QR code emails to.");
      return;
    }

    setSendingQrEmails(true);
    setQrJobStatus(null);
    try {
      const response = await fetch(`/api/admin/forms/${formId}/send-qr-emails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formVersionId: versionToUse.id,
          onlyUnsent: qrSendOnlyUnsent,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 409) {
          alert("A QR email job is already running for this form. Please wait for it to finish.");
          setSendingQrEmails(false);
          return;
        }
        throw new Error(error.message || error.error || "Failed to start QR email job");
      }

      const result = await response.json();
      if (!result.jobId) {
        alert(result.message || "No emails to send.");
        setSendingQrEmails(false);
        return;
      }

      setQrJobId(result.jobId);
    } catch (error) {
      console.error("Error starting QR email job:", error);
      alert(`Failed to start QR email job: ${error instanceof Error ? error.message : "Unknown error"}`);
      setSendingQrEmails(false);
    }
  };

  const handleCancelQrJob = async () => {
    if (!qrJobId) return;
    try {
      await fetch(`/api/admin/forms/${formId}/email-job-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", jobId: qrJobId }),
      });
    } catch {
      // Best-effort cancellation
    }
  };

  const toggleRecipientSelection = (companyId: string, repId: string) => {
    setReminderRecipients(prev => prev.map(company => {
      if (company.companyId === companyId) {
        return {
          ...company,
          representatives: company.representatives.map(rep => 
            rep.id === repId ? { ...rep, selected: !rep.selected } : rep
          ),
        };
      }
      return company;
    }));
  };

  const toggleCompanySelection = (companyId: string) => {
    setReminderRecipients(prev => prev.map(company => {
      if (company.companyId === companyId) {
        const allSelected = company.representatives.every(rep => rep.selected);
        return {
          ...company,
          representatives: company.representatives.map(rep => ({
            ...rep,
            selected: !allSelected,
          })),
        };
      }
      return company;
    }));
  };

  // Poll job status while a reminder email job is active
  useEffect(() => {
    if (!reminderJobId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/admin/forms/${formId}/email-job-status?jobId=${encodeURIComponent(reminderJobId)}`
        );
        if (!res.ok) return;
        const { job } = await res.json();
        if (cancelled) return;
        setReminderJobStatus(job);

        if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
          setSendingReminders(false);
        }
      } catch {
        // Polling failure is non-fatal
      }
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reminderJobId, formId]);

  const handleSendReminders = async () => {
    if (!form) return;
    
    let versionToUse: FormVersion | undefined;
    if (isAllVersions) {
      versionToUse = versions.find(v => {
        const metadata = v.metadata as any;
        return metadata?.is_company_form && metadata?.event_id;
      });
    } else {
      versionToUse = versions.find(v => v.id === selectedVersionId);
    }
    
    if (!versionToUse) return;

    const selectedRecipients: Array<{ companyId: string; repId: string; email: string }> = [];
    reminderRecipients.forEach(company => {
      company.representatives.forEach(rep => {
        if (rep.selected && rep.email) {
          selectedRecipients.push({
            companyId: company.companyId,
            repId: rep.id,
            email: rep.email,
          });
        }
      });
    });

    if (selectedRecipients.length === 0) {
      alert("Please select at least one recipient to send reminders to.");
      return;
    }

    setSendingReminders(true);
    setReminderJobStatus(null);
    try {
      const response = await fetch(`/api/admin/forms/${formId}/send-reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formVersionId: versionToUse.id,
          recipients: selectedRecipients,
          subject: reminderSubject,
          content: reminderContent,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 409) {
          alert("A reminder job is already running for this form. Please wait for it to finish.");
          setSendingReminders(false);
          return;
        }
        throw new Error(error.message || error.error || 'Failed to start reminder job');
      }

      const result = await response.json();
      if (!result.jobId) {
        alert(result.message || "No emails to send.");
        setSendingReminders(false);
        return;
      }

      setReminderJobId(result.jobId);
    } catch (error) {
      console.error("Error starting reminder job:", error);
      alert(`Failed to start reminder job: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSendingReminders(false);
    }
  };

  const handleCancelReminderJob = async () => {
    if (!reminderJobId) return;
    try {
      await fetch(`/api/admin/forms/${formId}/email-job-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", jobId: reminderJobId }),
      });
    } catch {
      // Best-effort cancellation
    }
  };

  const exportIncompleteCompaniesToCSV = async () => {
    if (incompleteCompanies.length === 0) return;

    // Prepare data for CSV - same format as submissions export
    const headerRow = ['Company Name', 'Salesperson', 'Option'];
    const dataRows = incompleteCompanies.map(company => [
      company.name,
      company.salesperson,
      company.optionName,
    ]);

    const escapeCsv = (value: unknown) => {
      const s = value === null || value === undefined ? "" : String(value);
      return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const csv = CSV_UTF8_BOM + [headerRow, ...dataRows]
      .map(row => row.map(escapeCsv).join(","))
      .join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${form?.slug}-incomplete-companies-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToCSV = async () => {
    if (isAllVersions && !formId) return;
    if (!isAllVersions && !selectedVersionId) return;

    // Fetch all responses for export
    let allResponses: FormResponse[];
    try {
      if (isAllVersions) {
        allResponses = await fetchAllFormResponsesForAllVersionsAction(formId);
      } else {
        allResponses = await fetchAllFormResponsesAction(selectedVersionId);
      }
    } catch (error) {
      console.error("Error fetching all responses for export:", error);
      alert("Failed to fetch all responses. Please try again.");
      return;
    }

    if (allResponses.length === 0) {
      alert("No responses to export.");
      return;
    }

    // Determine which fields to use
    let fieldsToUse: Array<{ id: string; name: string; label: string; type: string }>;
    if (isAllVersions) {
      fieldsToUse = allVersionsFields;
    } else {
      const selectedVersion = versions.find(v => v.id === selectedVersionId);
      if (!selectedVersion) return;
      fieldsToUse = selectedVersion.schema.fields.map(f => ({
        id: f.id,
        name: f.name,
        label: f.label || f.name,
        type: f.type,
      }));
    }

    // Check if both firstname and lastname fields exist
    const hasFirstNameField = fieldsToUse.some(f => f.name === 'firstname');
    const hasLastNameField = fieldsToUse.some(f => f.name === 'lastname');
    const shouldCombineName = hasFirstNameField && hasLastNameField;

    // Build field names and keys, combining firstname and lastname if both exist
    const fieldNames: string[] = [];
    const fieldKeys: string[] = [];
    const fieldTypeMap = new Map(fieldsToUse.map(f => [f.name, f.type]));

    fieldsToUse.forEach(field => {
      // For event registration forms, exclude email field from export since it's already in Student Email column
      const isEventRegistration = isAllVersions 
        ? versions.some(v => v.metadata?.is_event_registration)
        : versions.find(v => v.id === selectedVersionId)?.metadata?.is_event_registration;
      if (isEventRegistration && field.name === 'email' && field.type === 'email') {
        return;
      }
      
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
    // Check if this is a company form
    const isCompanyForm = isAllVersions
      ? versions.some(v => v.metadata?.is_company_form)
      : versions.find(v => v.id === selectedVersionId)?.metadata?.is_company_form;
    // Check if any response has student data (either in metadata or in form fields for event registration)
    const hasStudentData = allResponses.some(r => 
      r.data?._student_username || 
      r.data?._student_email || 
      (isEventRegistration && r.data?.email) // For event registration, email is in form data
    );
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

    // Prepare data for CSV
    const headerRow = [
      'Submission Date', 
      'Response ID',
      ...(isAllVersions ? ['Version'] : []),
      ...(isCompanyForm ? ['Company', 'Submitter First Name', 'Submitter Last Name', 'Submitter Email'] : []),
      ...(hasStudentData ? ['Student Username', 'Student Email', 'Student Full Name', 'Student University', 'Student University Status'] : []),
      ...fieldNames, 
      ...(isEventRegistration ? ['Attendant Link'] : [])
    ];
    
    const dataRows = allResponses.map(response => {
      const date = formatDateTimeBE(response.submitted_at);
      
      // Get version info for this response
      const responseVersion = isAllVersions
        ? versions.find(v => {
            const versionId = typeof response.form_version_id === 'string'
              ? response.form_version_id
              : (response.form_version_id as any)?.id;
            return v.id === versionId;
          })
        : null;
      const versionField = isAllVersions
        ? [responseVersion ? `Version ${responseVersion.version_number}${responseVersion.is_active ? ' (Active)' : ''}` : 'N/A']
        : [];
      
      // Add company form fields if applicable
      const companyFields = isCompanyForm ? [
        typeof response.company_id === 'object' && response.company_id?.name
          ? response.company_id.name
          : typeof response.company_id === 'string'
          ? response.company_id
          : '',
        response.submitter_first_name || '',
        response.submitter_last_name || '',
        response.submitter_email || '',
      ] : [];
      
      // Add student fields if applicable
      // For event registration forms, email might be in form data instead of metadata
      const studentEmail = isEventRegistration 
        ? (response.data.email as string) || response.data._student_email || ''
        : response.data._student_email || '';
      // For event registration forms, check metadata first (since we store it there), then student relation
      let studentFullName = '';
      if (isEventRegistration) {
        // First check metadata (this is what we store for event registration forms)
        const metadataFullName = response.data._student_full_name;
        if (metadataFullName && typeof metadataFullName === 'string') {
          studentFullName = metadataFullName;
        } else if (typeof response.student_id === 'object' && response.student_id) {
          // Fallback to student_id relation if metadata not available
          if (response.student_id.full_name) {
            studentFullName = response.student_id.full_name;
          } else {
            // Fallback to first_name + last_name from relation
            const firstName = response.student_id.first_name || '';
            const lastName = response.student_id.last_name || '';
            if (firstName || lastName) {
              const combinedName = `${firstName} ${lastName}`.trim();
              if (combinedName) {
                studentFullName = combinedName;
              }
            }
          }
        }
      } else {
        // For non-event registration forms, use metadata
        const metadataFullName = response.data._student_full_name;
        studentFullName = (metadataFullName && typeof metadataFullName === 'string') ? metadataFullName : '';
      }
      const studentFields = hasStudentData ? [
        response.data._student_username || '',
        studentEmail,
        studentFullName,
        response.data._student_university || '',
        response.data._student_university_status || '',
      ] : [];
      
      const values = fieldKeys.map(key => {
        if (shouldCombineName && key === 'firstname') {
          // Combine firstname and lastname
          const firstName = response.data['firstname'] || '';
          const lastName = response.data['lastname'] || '';
          const fullName = `${firstName} ${lastName}`.trim();
          return fullName;
        }
        const value = response.data?.[key];
        // For all versions mode, show NA if field doesn't exist in this response
        if (isAllVersions && (value === null || value === undefined)) {
          return 'NA';
        }
        if (value === null || value === undefined) return '';
        // Resolve master-degrees to display names (e.g. fac:1:3 -> Fac. Engineering - Architectural Engineering)
        if (fieldTypeMap.get(key) === 'master-degrees') {
          const items = Array.isArray(value) ? value : [value];
          const labels = items.map((v: unknown) =>
            resolveMasterDegreeValueToDisplayLabel(v, mastersForDisplay, facultiesForDisplay) || String(v)
          );
          return labels.join('; ');
        }
        if (Array.isArray(value)) return value.join('; ');
        return String(value);
      });
      
      // Add attendant link if UUID exists
      const attendantLink = response.attendant_uuid 
        ? `${baseUrl}/attendant/${response.attendant_uuid}`
        : '';
      
      return [date, response.id, ...versionField, ...companyFields, ...studentFields, ...values, ...(isEventRegistration ? [attendantLink] : [])];
    });

    const escapeCsv = (value: unknown) => {
      const s = value === null || value === undefined ? "" : String(value);
      return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const csv = CSV_UTF8_BOM + [headerRow, ...dataRows]
      .map(row => row.map(escapeCsv).join(","))
      .join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${form?.slug}-responses-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadAllFiles = async () => {
    if (!formId) return;
    setDownloadingAllFiles(true);
    try {
      const res = await fetch(`/api/admin/forms/${formId}/download-all-files`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || "Download failed");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${form?.slug ?? formId}-all-files.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading all files:", error);
      alert(`Failed to download files: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setDownloadingAllFiles(false);
    }
  };

  const hasFileFields = versions.some((v) =>
    v.schema?.fields?.some((f) => f.type === "file")
  );

  const hasMasterDegreesFields = versions.some((v) =>
    v.schema?.fields?.some((f) => f.type === "master-degrees")
  );

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

  const handleEditClick = (response: FormResponse) => {
    setResponseToEdit(response);
    setEditFormData({ ...(response.data || {}) });
    setEditingField(null);
    setEditingFieldValue("");
    setEditSubmitterInfo({
      first_name: response.submitter_first_name || "",
      last_name: response.submitter_last_name || "",
      email: response.submitter_email || "",
    });
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!responseToEdit) return;

    setEditing(true);
    try {
      const updatePayload: {
        data: Record<string, unknown>;
        submitter_first_name?: string;
        submitter_last_name?: string;
        submitter_email?: string;
      } = {
        data: editFormData,
      };

      const responseVersion = isAllVersions
        ? versions.find(v => {
            const versionId = typeof responseToEdit.form_version_id === "string"
              ? responseToEdit.form_version_id
              : (responseToEdit.form_version_id as { id?: string })?.id;
            return v.id === versionId;
          })
        : selectedVersion;
      const isCompanyForm = responseVersion?.metadata?.is_company_form && responseVersion?.metadata?.event_id;

      if (isCompanyForm) {
        updatePayload.submitter_first_name = editSubmitterInfo.first_name || undefined;
        updatePayload.submitter_last_name = editSubmitterInfo.last_name || undefined;
        updatePayload.submitter_email = editSubmitterInfo.email || undefined;
      }

      await updateFormResponseAction(responseToEdit.id, updatePayload);

      setResponses(responses.map(r =>
        r.id === responseToEdit.id
          ? {
              ...r,
              data: editFormData,
              ...(isCompanyForm && {
                submitter_first_name: editSubmitterInfo.first_name,
                submitter_last_name: editSubmitterInfo.last_name,
                submitter_email: editSubmitterInfo.email,
              }),
            }
          : r
      ));
      setEditDialogOpen(false);
      setResponseToEdit(null);
    } catch (error) {
      console.error("Error updating response:", error);
      alert("Failed to update response. Please try again.");
    } finally {
      setEditing(false);
    }
  };

  const valueToEditString = (value: unknown, fieldType: string): string => {
    if (value === null || value === undefined) return "";
    if (Array.isArray(value)) return value.map((v) => String(v)).join("\n");
    if (typeof value === "object" && value !== null && "start" in value && "end" in value) {
      const dr = value as { start?: string; end?: string };
      return [dr.start || "", dr.end || ""].filter(Boolean).join(" – ");
    }
    return String(value);
  };

  const parseEditStringToValue = (text: string, fieldType: string): unknown => {
    const trimmed = text.trim();
    if (fieldType === "checkbox") {
      return trimmed ? trimmed.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean) : [];
    }
    if (fieldType === "number") {
      const num = parseFloat(trimmed);
      return isNaN(num) ? "" : num;
    }
    if (fieldType === "date-range") {
      const parts = trimmed.split(/[–-]/).map((s) => s.trim());
      return { start: parts[0] || "", end: parts[1] || "" };
    }
    return trimmed;
  };

  const handleInlineEditStart = (responseId: string, fieldName: string, value: unknown, fieldType: string) => {
    setEditingField({ responseId, fieldName });
    setEditingFieldValue(valueToEditString(value, fieldType));
  };

  const handleInlineEditCancel = () => {
    setEditingField(null);
    setEditingFieldValue("");
  };

  const handleInlineEditSave = () => {
    if (!editingField || !responseToEdit) return;
    if (editingField.responseId !== responseToEdit.id) return;

    const fields = (() => {
      const schemaFields = (() => {
        const v = isAllVersions
          ? versions.find((v) => v.id === (typeof responseToEdit.form_version_id === "string" ? responseToEdit.form_version_id : (responseToEdit.form_version_id as { id?: string })?.id))
          : selectedVersion;
        return v?.schema?.fields ?? [];
      })();
      return schemaFields.length > 0 ? schemaFields : allVersionsFields;
    })();
    const field = fields.find((f) => f.name === editingField.fieldName);
    const fieldType = field?.type ?? "text";

    const newValue = parseEditStringToValue(editingFieldValue, fieldType);
    setEditFormData((prev) => ({ ...prev, [editingField.fieldName]: newValue }));
    handleInlineEditCancel();
  };

  const handleArchiveDuplicates = async () => {
    if (!form || !formId) return;
    if (!confirm(`Archive duplicate responses for "${form.name}"? This will keep only the most recent response per student or company and archive older ones.`)) {
      return;
    }
    setArchivingDuplicates(true);
    try {
      const result = await archiveDuplicateFormResponsesAction(formId);
      alert(result.archived > 0 ? `Archived ${result.archived} duplicate response(s).` : "No duplicate responses found.");
      await loadResponses(isAllVersions ? "" : selectedVersionId, currentPage, isAllVersions);
    } catch (error) {
      console.error("Error archiving duplicates:", error);
      alert("Failed to archive duplicates. Please try again.");
    } finally {
      setArchivingDuplicates(false);
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
                {totalCount} response(s) {isAllVersions ? "across all versions" : selectedVersion && `for version ${selectedVersion.version_number}`}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select 
                value={isAllVersions ? "__all__" : selectedVersionId} 
                onValueChange={(value) => {
                  if (value === "__all__") {
                    setIsAllVersions(true);
                    setSelectedVersionId("");
                  } else {
                    setIsAllVersions(false);
                    setSelectedVersionId(value);
                  }
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select version" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="__all__" value="__all__">
                    All Versions
                  </SelectItem>
                  {versions.map((version) => (
                    <SelectItem key={version.id} value={version.id}>
                      Version {version.version_number}
                      {version.is_active && " (Active)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {viewMode === "submissions" && (
                <Button
                  variant="outline"
                  onClick={handleArchiveDuplicates}
                  disabled={archivingDuplicates || totalCount === 0}
                  title="Archive duplicate responses, keeping only the most recent per student"
                >
                  {archivingDuplicates ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Archiving...
                    </>
                  ) : (
                    <>
                      <Archive className="h-4 w-4 mr-2" />
                      Archive duplicates
                    </>
                  )}
                </Button>
              )}
              {!isAllVersions && selectedVersion?.metadata?.is_event_registration && (
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
              {versions.some(v => v.metadata?.is_event_registration) && totalCount > 0 && (
                <Button
                  variant="outline"
                  onClick={handleOpenQrDialog}
                  title="Send QR code emails to event attendees"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send QR Emails
                </Button>
              )}
              {versions.some(v => v.metadata?.is_event_registration) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    const versionToUse = isAllVersions
                      ? (versions.find(v => v.is_active) ?? versions[0])
                      : versions.find(v => v.id === selectedVersionId) ?? versions[0];
                    const meta = versionToUse?.metadata as { scanning_columns?: typeof scanningColumns } | undefined;
                    setScanningColumns(meta?.scanning_columns ?? {});
                    setScanningColumnsDialogOpen(true);
                  }}
                  title="Configure which form columns to show in the scanning system (University, Faculty, Master, Year of study)"
                >
                  <Scan className="h-4 w-4 mr-2" />
                  Scanning columns
                </Button>
              )}
              {viewMode === "incomplete" && versions.some(v => v.metadata?.is_company_form) && incompleteCompanies.length > 0 && (
                <Button
                  variant="outline"
                  onClick={handleOpenReminderDialog}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Reminders
                </Button>
              )}
              {hasFileFields && (
                <Button
                  variant="outline"
                  onClick={handleDownloadAllFiles}
                  disabled={downloadingAllFiles || (viewMode === "submissions" && totalCount === 0)}
                >
                  {downloadingAllFiles ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <FileArchive className="h-4 w-4 mr-2" />
                      Download all files
                    </>
                  )}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={viewMode === "submissions" ? exportToCSV : exportIncompleteCompaniesToCSV}
                disabled={viewMode === "submissions" ? totalCount === 0 : incompleteCompanies.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingResponses ? (
            <div className="text-center py-8">Loading responses...</div>
          ) : viewMode === "submissions" && responses.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {isAllVersions ? "No responses yet across all versions." : "No responses yet for this version."}
              </p>
              {!isAllVersions && selectedVersion && (
                <Button variant="outline" asChild>
                  <Link 
                    href={
                      selectedVersion?.metadata?.is_company_form && selectedVersion.metadata?.event_id
                        ? `/forms/company/${selectedVersion.metadata.event_id}/${form.slug}`
                        : `/forms/${form.slug}`
                    } 
                    target="_blank"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Public Form
                  </Link>
                </Button>
              )}
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

              {/* Company Form Completion Stats */}
              {versions.some(v => v.metadata?.is_company_form) && companyCompletionStats !== null && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Company Completion Status</CardTitle>
                        <CardDescription>
                          Click on a card to view the corresponding companies
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div 
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          viewMode === "submissions" 
                            ? "bg-green-100 border-green-400 shadow-md" 
                            : "bg-green-50 border-green-200 hover:bg-green-100"
                        }`}
                        onClick={() => setViewMode("submissions")}
                      >
                        <div className={`text-3xl font-bold ${viewMode === "submissions" ? "text-green-800" : "text-green-700"}`}>
                          {companyCompletionStats.completed}
                        </div>
                        <div className={`text-sm mt-1 ${viewMode === "submissions" ? "text-green-700 font-medium" : "text-green-600"}`}>
                          Completed {viewMode === "submissions" && "← Viewing"}
                        </div>
                      </div>
                      <div 
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          viewMode === "incomplete" 
                            ? "bg-red-100 border-red-400 shadow-md" 
                            : "bg-red-50 border-red-200 hover:bg-red-100"
                        }`}
                        onClick={() => {
                          setViewMode("incomplete");
                          loadIncompleteCompanies();
                        }}
                      >
                        <div className={`text-3xl font-bold ${viewMode === "incomplete" ? "text-red-800" : "text-red-700"}`}>
                          {companyCompletionStats.incomplete}
                        </div>
                        <div className={`text-sm mt-1 ${viewMode === "incomplete" ? "text-red-700 font-medium" : "text-red-600"}`}>
                          Incomplete {viewMode === "incomplete" && "← Viewing"}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Table - either submissions or incomplete companies */}
              {viewMode === "submissions" ? (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <button
                            onClick={() => {
                              if (submissionsSortField === "submitted_at") {
                                setSubmissionsSortDirection(submissionsSortDirection === "asc" ? "desc" : "asc");
                              } else {
                                setSubmissionsSortField("submitted_at");
                                setSubmissionsSortDirection("desc");
                              }
                            }}
                            className="flex items-center gap-1 hover:text-foreground transition-colors"
                          >
                            Submitted
                            {submissionsSortField === "submitted_at" ? (
                              submissionsSortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                            ) : (
                              <ArrowUpDown className="h-4 w-4 opacity-50" />
                            )}
                          </button>
                        </TableHead>
                        {!isAllVersions && selectedVersion?.metadata?.is_company_form && (
                          <>
                            <TableHead>
                              <button
                                onClick={() => {
                                  if (submissionsSortField === "company_name") {
                                    setSubmissionsSortDirection(submissionsSortDirection === "asc" ? "desc" : "asc");
                                  } else {
                                    setSubmissionsSortField("company_name");
                                    setSubmissionsSortDirection("asc");
                                  }
                                }}
                                className="flex items-center gap-1 hover:text-foreground transition-colors"
                              >
                                Company
                                {submissionsSortField === "company_name" ? (
                                  submissionsSortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                ) : (
                                  <ArrowUpDown className="h-4 w-4 opacity-50" />
                                )}
                              </button>
                            </TableHead>
                            <TableHead>Submitter Name</TableHead>
                            <TableHead>Submitter Email</TableHead>
                          </>
                        )}
                        {isAllVersions && versions.some(v => v.metadata?.is_company_form) && (
                          <>
                            <TableHead>
                              <button
                                onClick={() => {
                                  if (submissionsSortField === "company_name") {
                                    setSubmissionsSortDirection(submissionsSortDirection === "asc" ? "desc" : "asc");
                                  } else {
                                    setSubmissionsSortField("company_name");
                                    setSubmissionsSortDirection("asc");
                                  }
                                }}
                                className="flex items-center gap-1 hover:text-foreground transition-colors"
                              >
                                Company
                                {submissionsSortField === "company_name" ? (
                                  submissionsSortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                ) : (
                                  <ArrowUpDown className="h-4 w-4 opacity-50" />
                                )}
                              </button>
                            </TableHead>
                            <TableHead>Submitter Name</TableHead>
                            <TableHead>Submitter Email</TableHead>
                          </>
                        )}
                        {responses.some(r => 
                          r.data?._student_username || 
                          r.data?._student_email || 
                          (isAllVersions ? versions.some(v => v.metadata?.is_event_registration) : selectedVersion?.metadata?.is_event_registration) && r.data?.email
                        ) && (
                          <>
                            <TableHead>Student Username</TableHead>
                            <TableHead>Student Email</TableHead>
                            <TableHead>Student Full Name</TableHead>
                            <TableHead>Student University</TableHead>
                            <TableHead>Student University Status</TableHead>
                          </>
                        )}
                        {isAllVersions ? (
                          <>
                            <TableHead>Version</TableHead>
                            {allVersionsFields
                              .filter(field => {
                                // For event registration forms, exclude email field since it's already in Student Email column
                                const isEventRegistration = versions.some(v => v.metadata?.is_event_registration);
                                if (isEventRegistration && field.name === 'email' && field.type === 'email') {
                                  return false;
                                }
                                return true;
                              })
                              .map((field) => (
                                <TableHead key={field.name}>{field.label || field.name}</TableHead>
                              ))}
                          </>
                        ) : (
                          selectedVersion?.schema.fields
                            .filter(field => {
                              // For event registration forms, exclude email field since it's already in Student Email column
                              if (selectedVersion?.metadata?.is_event_registration && field.name === 'email' && field.type === 'email') {
                                return false;
                              }
                              return true;
                            })
                            .map((field) => (
                              <TableHead key={field.name}>{field.label || field.name}</TableHead>
                            ))
                        )}
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...responses]
                        .sort((a, b) => {
                          if (submissionsSortField === "submitted_at") {
                            const aTime = new Date(a.submitted_at).getTime();
                            const bTime = new Date(b.submitted_at).getTime();
                            const comparison = aTime - bTime;
                            return submissionsSortDirection === "asc" ? comparison : -comparison;
                          } else {
                            // Sort by company name
                            const aCompanyName = typeof a.company_id === 'object' && a.company_id?.name
                              ? a.company_id.name
                              : typeof a.company_id === 'string'
                              ? a.company_id
                              : '';
                            const bCompanyName = typeof b.company_id === 'object' && b.company_id?.name
                              ? b.company_id.name
                              : typeof b.company_id === 'string'
                              ? b.company_id
                              : '';
                            const comparison = aCompanyName.toLowerCase().localeCompare(bCompanyName.toLowerCase());
                            return submissionsSortDirection === "asc" ? comparison : -comparison;
                          }
                        })
                        .map((response) => {
                        // Get the version for this response
                        const responseVersion = isAllVersions 
                          ? versions.find(v => {
                              const versionId = typeof response.form_version_id === 'string' 
                                ? response.form_version_id 
                                : (response.form_version_id as any)?.id;
                              return v.id === versionId;
                            })
                          : selectedVersion;
                        const isCompanyForm = isAllVersions 
                          ? versions.some(v => v.metadata?.is_company_form)
                          : selectedVersion?.metadata?.is_company_form;
                        const isEventRegistration = isAllVersions
                          ? versions.some(v => v.metadata?.is_event_registration)
                          : selectedVersion?.metadata?.is_event_registration;
                        
                        return (
                          <TableRow key={response.id}>
                            <TableCell className="font-medium">
                              {formatDateTimeBE(response.submitted_at)}
                            </TableCell>
                            {isCompanyForm && (
                              <>
                                <TableCell>
                                  {typeof response.company_id === 'object' && response.company_id?.name
                                    ? response.company_id.name
                                    : typeof response.company_id === 'string'
                                    ? response.company_id
                                    : 'N/A'}
                                </TableCell>
                                <TableCell>
                                  {response.submitter_first_name || response.submitter_last_name
                                    ? `${response.submitter_first_name || ''} ${response.submitter_last_name || ''}`.trim()
                                    : 'N/A'}
                                </TableCell>
                                <TableCell>
                                  {response.submitter_email || 'N/A'}
                                </TableCell>
                              </>
                            )}
                            {responses.some(r => 
                              r.data?._student_username || 
                              r.data?._student_email || 
                              (isEventRegistration && r.data?.email)
                            ) && (
                              <>
                                <TableCell>
                                  {(typeof response.data._student_username === 'string' ? response.data._student_username : '') || 'N/A'}
                                </TableCell>
                                <TableCell>
                                  {isEventRegistration
                                    ? (typeof response.data.email === 'string' ? response.data.email : '') || (typeof response.data._student_email === 'string' ? response.data._student_email : '') || 'N/A'
                                    : (typeof response.data._student_email === 'string' ? response.data._student_email : '') || 'N/A'}
                                </TableCell>
                                <TableCell>
                                  {(() => {
                                    // For event registration forms, check metadata first (since we store it there), then student relation
                                    if (isEventRegistration) {
                                      // First check metadata (this is what we store for event registration forms)
                                      const metadataFullName = response.data._student_full_name;
                                      if (metadataFullName && typeof metadataFullName === 'string') {
                                        return metadataFullName;
                                      }
                                      // Fallback to student_id relation if metadata not available
                                      if (typeof response.student_id === 'object' && response.student_id) {
                                        if (response.student_id.full_name) {
                                          return response.student_id.full_name;
                                        }
                                        // Fallback to first_name + last_name from relation
                                        const firstName = response.student_id.first_name || '';
                                        const lastName = response.student_id.last_name || '';
                                        if (firstName || lastName) {
                                          const combinedName = `${firstName} ${lastName}`.trim();
                                          if (combinedName) {
                                            return combinedName;
                                          }
                                        }
                                      }
                                      return 'N/A';
                                    }
                                    // For non-event registration forms, use metadata
                                    const metadataFullName = response.data._student_full_name;
                                    return (metadataFullName && typeof metadataFullName === 'string') ? metadataFullName : 'N/A';
                                  })()}
                                </TableCell>
                                <TableCell>
                                  {(typeof response.data._student_university === 'string' ? response.data._student_university : '') || 'N/A'}
                                </TableCell>
                                <TableCell>
                                  {(typeof response.data._student_university_status === 'string' ? response.data._student_university_status : '') || 'N/A'}
                                </TableCell>
                              </>
                            )}
                            {isAllVersions ? (
                              <>
                                <TableCell>
                                  {responseVersion 
                                    ? `Version ${responseVersion.version_number}${responseVersion.is_active ? ' (Active)' : ''}`
                                    : typeof response.form_version_id === 'object' && (response.form_version_id as any)?.version_number
                                    ? `Version ${(response.form_version_id as any).version_number}`
                                    : 'N/A'}
                                </TableCell>
                                {allVersionsFields
                                  .filter(field => {
                                    // For event registration forms, exclude email field since it's already in Student Email column
                                    if (isEventRegistration && field.name === 'email' && field.type === 'email') {
                                      return false;
                                    }
                                    return true;
                                  })
                                  .map((field) => {
                                    const fieldValue = response.data?.[field.name];
                                    const fieldType = field.type;
                                    return (
                                      <TableCell key={field.name}>
                                        {fieldValue !== null && fieldValue !== undefined
                                          ? formatFieldValue(fieldValue, fieldType, { masters: mastersForDisplay, faculties: facultiesForDisplay })
                                          : <span className="text-muted-foreground italic">NA</span>}
                                      </TableCell>
                                    );
                                  })}
                              </>
                            ) : (
                              selectedVersion?.schema.fields
                                .filter(field => {
                                  if (selectedVersion?.metadata?.is_event_registration && field.name === 'email' && field.type === 'email') return false;
                                  return true;
                                })
                                .map((field) => (
                                  <TableCell key={field.name}>
                                    {formatFieldValue(response.data[field.name], field.type, { masters: mastersForDisplay, faculties: facultiesForDisplay })}
                                  </TableCell>
                                ))
                            )}
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditClick(response)}
                                  title="Edit response"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteClick(response)}
                                  className="text-destructive hover:text-destructive"
                                  title="Delete response"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  {loadingIncompleteCompanies ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Loading incomplete companies...</p>
                    </div>
                  ) : incompleteCompanies.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground mb-4">All companies have completed this form!</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            <button
                              onClick={() => {
                                if (incompleteSortField === "name") {
                                  setIncompleteSortDirection(incompleteSortDirection === "asc" ? "desc" : "asc");
                                } else {
                                  setIncompleteSortField("name");
                                  setIncompleteSortDirection("asc");
                                }
                              }}
                              className="flex items-center gap-1 hover:text-foreground transition-colors"
                            >
                              Company Name
                              {incompleteSortField === "name" ? (
                                incompleteSortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                              ) : (
                                <ArrowUpDown className="h-4 w-4 opacity-50" />
                              )}
                            </button>
                          </TableHead>
                          <TableHead>
                            <button
                              onClick={() => {
                                if (incompleteSortField === "salesperson") {
                                  setIncompleteSortDirection(incompleteSortDirection === "asc" ? "desc" : "asc");
                                } else {
                                  setIncompleteSortField("salesperson");
                                  setIncompleteSortDirection("asc");
                                }
                              }}
                              className="flex items-center gap-1 hover:text-foreground transition-colors"
                            >
                              Salesperson
                              {incompleteSortField === "salesperson" ? (
                                incompleteSortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                              ) : (
                                <ArrowUpDown className="h-4 w-4 opacity-50" />
                              )}
                            </button>
                          </TableHead>
                          <TableHead>
                            <button
                              onClick={() => {
                                if (incompleteSortField === "optionName") {
                                  setIncompleteSortDirection(incompleteSortDirection === "asc" ? "desc" : "asc");
                                } else {
                                  setIncompleteSortField("optionName");
                                  setIncompleteSortDirection("asc");
                                }
                              }}
                              className="flex items-center gap-1 hover:text-foreground transition-colors"
                            >
                              Option
                              {incompleteSortField === "optionName" ? (
                                incompleteSortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                              ) : (
                                <ArrowUpDown className="h-4 w-4 opacity-50" />
                              )}
                            </button>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...incompleteCompanies]
                          .sort((a, b) => {
                            let aValue: string;
                            let bValue: string;
                            
                            if (incompleteSortField === "name") {
                              aValue = a.name.toLowerCase();
                              bValue = b.name.toLowerCase();
                            } else if (incompleteSortField === "salesperson") {
                              aValue = a.salesperson.toLowerCase();
                              bValue = b.salesperson.toLowerCase();
                            } else {
                              aValue = a.optionName.toLowerCase();
                              bValue = b.optionName.toLowerCase();
                            }
                            
                            const comparison = aValue.localeCompare(bValue);
                            return incompleteSortDirection === "asc" ? comparison : -comparison;
                          })
                          .map((company) => (
                            <TableRow key={company.id}>
                              <TableCell className="font-medium">{company.name}</TableCell>
                              <TableCell>{company.salesperson}</TableCell>
                              <TableCell>{company.optionName}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}

              {/* Pagination Controls - only show for submissions */}
              {viewMode === "submissions" && totalCount > pageSize && (
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

      {/* Send QR Emails Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={(open) => {
        if (!open && sendingQrEmails) return; // Prevent closing while sending
        if (!open) {
          setQrJobId(null);
          setQrJobStatus(null);
        }
        setQrDialogOpen(open);
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send QR Code Emails</DialogTitle>
            <DialogDescription>
              Send the event confirmation email with QR code to registered attendees.
            </DialogDescription>
          </DialogHeader>

          {sendingQrEmails && qrJobStatus ? (
            // Active job progress view
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {qrJobStatus.status === "processing" ? "Sending emails..." :
                     qrJobStatus.status === "completed" ? "Completed" :
                     qrJobStatus.status === "cancelled" ? "Cancelled" :
                     qrJobStatus.status === "failed" ? "Failed" : "Starting..."}
                  </span>
                  <span className="font-medium tabular-nums">
                    {qrJobStatus.sent + qrJobStatus.failed + qrJobStatus.skipped} / {qrJobStatus.total}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      qrJobStatus.status === "failed" ? "bg-red-500" :
                      qrJobStatus.status === "cancelled" ? "bg-amber-500" :
                      qrJobStatus.status === "completed" ? "bg-green-500" :
                      "bg-primary"
                    }`}
                    style={{
                      width: `${qrJobStatus.total > 0
                        ? ((qrJobStatus.sent + qrJobStatus.failed + qrJobStatus.skipped) / qrJobStatus.total) * 100
                        : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-2xl font-bold text-green-600 tabular-nums">{qrJobStatus.sent}</div>
                  <div className="text-xs text-muted-foreground">Sent</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-2xl font-bold text-red-600 tabular-nums">{qrJobStatus.failed}</div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-2xl font-bold text-muted-foreground tabular-nums">{qrJobStatus.skipped}</div>
                  <div className="text-xs text-muted-foreground">Skipped</div>
                </div>
              </div>

              {qrJobStatus.status === "processing" && (
                <p className="text-xs text-muted-foreground text-center">
                  Emails are being sent in batches. You can close this page and they will continue sending in the background.
                </p>
              )}

              {qrJobStatus.errors.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 p-3 max-h-32 overflow-y-auto">
                  <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">Errors:</p>
                  {qrJobStatus.errors.slice(0, 10).map((err, i) => (
                    <p key={i} className="text-xs text-red-600 dark:text-red-400 truncate">{err}</p>
                  ))}
                  {qrJobStatus.errors.length > 10 && (
                    <p className="text-xs text-red-500 mt-1">...and {qrJobStatus.errors.length - 10} more</p>
                  )}
                </div>
              )}

              {(qrJobStatus.status === "completed" || qrJobStatus.status === "cancelled" || qrJobStatus.status === "failed") && (
                <div className={`rounded-lg border p-3 text-center text-sm ${
                  qrJobStatus.status === "completed" && qrJobStatus.failed === 0
                    ? "border-green-200 bg-green-50 text-green-700 dark:bg-green-950/20 dark:border-green-900 dark:text-green-400"
                    : qrJobStatus.status === "cancelled"
                    ? "border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-400"
                    : "border-red-200 bg-red-50 text-red-700 dark:bg-red-950/20 dark:border-red-900 dark:text-red-400"
                }`}>
                  {qrJobStatus.status === "completed" && qrJobStatus.failed === 0 && (
                    <><Check className="h-4 w-4 inline mr-1" />All emails sent successfully</>
                  )}
                  {qrJobStatus.status === "completed" && qrJobStatus.failed > 0 && (
                    <>Completed with {qrJobStatus.failed} error(s). You can retry the failed ones by sending again with &quot;only unsent&quot;.</>
                  )}
                  {qrJobStatus.status === "cancelled" && (
                    <><X className="h-4 w-4 inline mr-1" />Job was cancelled. {qrJobStatus.sent} email(s) were already sent.</>
                  )}
                  {qrJobStatus.status === "failed" && (
                    <>Job failed. {qrJobStatus.sent} email(s) were sent before the failure.</>
                  )}
                </div>
              )}
            </div>
          ) : loadingQrStats ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading attendee data...</p>
            </div>
          ) : qrEmailStats && qrEmailStats.total > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-2xl font-bold">{qrEmailStats.total}</div>
                  <div className="text-xs text-muted-foreground">Total attendees</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">{qrEmailStats.sent}</div>
                  <div className="text-xs text-muted-foreground">Already sent</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-2xl font-bold text-amber-600">{qrEmailStats.unsent}</div>
                  <div className="text-xs text-muted-foreground">Not yet sent</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="qr-only-unsent"
                  checked={qrSendOnlyUnsent}
                  onCheckedChange={(checked) => setQrSendOnlyUnsent(!!checked)}
                />
                <Label htmlFor="qr-only-unsent" className="text-sm cursor-pointer">
                  Only send to attendees who haven&apos;t received it yet ({qrEmailStats.unsent})
                </Label>
              </div>

              {!qrSendOnlyUnsent && qrEmailStats.sent > 0 && (
                <p className="text-xs text-amber-600">
                  This will resend QR code emails to {qrEmailStats.sent} attendee(s) who already received one.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No attendees with a QR code found. Make sure UUIDs have been initialized.</p>
          )}

          <DialogFooter>
            {sendingQrEmails && qrJobStatus?.status === "processing" ? (
              <Button
                variant="destructive"
                onClick={handleCancelQrJob}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel Sending
              </Button>
            ) : qrJobStatus && (qrJobStatus.status === "completed" || qrJobStatus.status === "cancelled" || qrJobStatus.status === "failed") ? (
              <Button onClick={() => {
                setQrJobId(null);
                setQrJobStatus(null);
                setQrDialogOpen(false);
              }}>
                Close
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setQrDialogOpen(false)}
                  disabled={sendingQrEmails}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendQrEmails}
                  disabled={
                    sendingQrEmails ||
                    loadingQrStats ||
                    !qrEmailStats ||
                    (qrSendOnlyUnsent ? qrEmailStats?.unsent === 0 : qrEmailStats?.total === 0)
                  }
                >
                  {sendingQrEmails ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send to {qrSendOnlyUnsent ? qrEmailStats?.unsent ?? 0 : qrEmailStats?.total ?? 0} attendee(s)
                    </>
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Reminders Dialog */}
      <Dialog open={reminderDialogOpen} onOpenChange={(open) => {
        if (!open && sendingReminders) return;
        if (!open) {
          setReminderJobId(null);
          setReminderJobStatus(null);
        }
        setReminderDialogOpen(open);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send Reminder Emails</DialogTitle>
            <DialogDescription>
              Customize the email and select which companies/representatives should receive the reminder
            </DialogDescription>
          </DialogHeader>
          
          {sendingReminders && reminderJobStatus ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {reminderJobStatus.status === "processing" ? "Sending reminders..." :
                     reminderJobStatus.status === "completed" ? "Completed" :
                     reminderJobStatus.status === "cancelled" ? "Cancelled" :
                     reminderJobStatus.status === "failed" ? "Failed" : "Starting..."}
                  </span>
                  <span className="font-medium tabular-nums">
                    {reminderJobStatus.sent + reminderJobStatus.failed + reminderJobStatus.skipped} / {reminderJobStatus.total}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      reminderJobStatus.status === "failed" ? "bg-red-500" :
                      reminderJobStatus.status === "cancelled" ? "bg-amber-500" :
                      reminderJobStatus.status === "completed" ? "bg-green-500" :
                      "bg-primary"
                    }`}
                    style={{
                      width: `${reminderJobStatus.total > 0
                        ? ((reminderJobStatus.sent + reminderJobStatus.failed + reminderJobStatus.skipped) / reminderJobStatus.total) * 100
                        : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-2xl font-bold text-green-600 tabular-nums">{reminderJobStatus.sent}</div>
                  <div className="text-xs text-muted-foreground">Sent</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-2xl font-bold text-red-600 tabular-nums">{reminderJobStatus.failed}</div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-2xl font-bold text-muted-foreground tabular-nums">{reminderJobStatus.skipped}</div>
                  <div className="text-xs text-muted-foreground">Skipped</div>
                </div>
              </div>

              {reminderJobStatus.errors.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 p-3 max-h-32 overflow-y-auto">
                  <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">Errors:</p>
                  {reminderJobStatus.errors.slice(0, 10).map((err, i) => (
                    <p key={i} className="text-xs text-red-600 dark:text-red-400 truncate">{err}</p>
                  ))}
                  {reminderJobStatus.errors.length > 10 && (
                    <p className="text-xs text-red-500 mt-1">...and {reminderJobStatus.errors.length - 10} more</p>
                  )}
                </div>
              )}

              {(reminderJobStatus.status === "completed" || reminderJobStatus.status === "cancelled" || reminderJobStatus.status === "failed") && (
                <div className={`rounded-lg border p-3 text-center text-sm ${
                  reminderJobStatus.status === "completed" && reminderJobStatus.failed === 0
                    ? "border-green-200 bg-green-50 text-green-700 dark:bg-green-950/20 dark:border-green-900 dark:text-green-400"
                    : reminderJobStatus.status === "cancelled"
                    ? "border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-400"
                    : "border-red-200 bg-red-50 text-red-700 dark:bg-red-950/20 dark:border-red-900 dark:text-red-400"
                }`}>
                  {reminderJobStatus.status === "completed" && reminderJobStatus.failed === 0 && (
                    <><Check className="h-4 w-4 inline mr-1" />All reminders sent successfully</>
                  )}
                  {reminderJobStatus.status === "completed" && reminderJobStatus.failed > 0 && (
                    <>Completed with {reminderJobStatus.failed} error(s)</>
                  )}
                  {reminderJobStatus.status === "cancelled" && (
                    <><X className="h-4 w-4 inline mr-1" />Job was cancelled. {reminderJobStatus.sent} reminder(s) were already sent.</>
                  )}
                  {reminderJobStatus.status === "failed" && (
                    <>Job failed. {reminderJobStatus.sent} reminder(s) were sent before the failure.</>
                  )}
                </div>
              )}
            </div>
          ) : loadingRecipients ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading recipients...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Email Subject */}
              <div className="space-y-2">
                <Label htmlFor="reminder-subject">Email Subject</Label>
                <Input
                  id="reminder-subject"
                  value={reminderSubject}
                  onChange={(e) => setReminderSubject(e.target.value)}
                  placeholder="Reminder: Please Complete [Form Name]"
                />
              </div>

              {/* Email Content */}
              <div className="space-y-2">
                <Label htmlFor="reminder-content">Email Content</Label>
                <Textarea
                  id="reminder-content"
                  value={reminderContent}
                  onChange={(e) => setReminderContent(e.target.value)}
                  placeholder="Dear {name},..."
                  rows={8}
                />
                <p className="text-xs text-muted-foreground">
                  Available placeholders: {"{name}"}, {"{company}"}, {"{form_name}"}, {"{form_link}"}
                </p>
              </div>

              {/* Recipients List */}
              <div className="space-y-2">
                <Label>Recipients ({reminderRecipients.reduce((sum, c) => sum + c.representatives.filter(r => r.selected).length, 0)} selected)</Label>
                <div className="border rounded-lg max-h-96 overflow-y-auto">
                  {reminderRecipients.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No recipients found
                    </div>
                  ) : (
                    <div className="divide-y">
                      {reminderRecipients.map((company) => {
                        const selectedCount = company.representatives.filter(r => r.selected).length;
                        const anySelected = selectedCount > 0;
                        return (
                          <div key={company.companyId} className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Checkbox
                                checked={anySelected}
                                onCheckedChange={() => toggleCompanySelection(company.companyId)}
                              />
                              <span className="font-medium">{company.companyName}</span>
                              <span className="text-sm text-muted-foreground">
                                ({selectedCount}/{company.representatives.length} selected)
                              </span>
                            </div>
                            <div className="ml-6 space-y-2">
                              {company.representatives.map((rep) => (
                                <div key={rep.id} className="flex items-center gap-2">
                                  <Checkbox
                                    checked={rep.selected}
                                    onCheckedChange={() => toggleRecipientSelection(company.companyId, rep.id)}
                                    disabled={!rep.email}
                                  />
                                  <span className="text-sm">
                                    {rep.firstName} {rep.lastName}
                                    {rep.email ? (
                                      <span className="text-muted-foreground ml-2">({rep.email})</span>
                                    ) : (
                                      <span className="text-red-500 ml-2">(No email)</span>
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {sendingReminders && reminderJobStatus?.status === "processing" ? (
              <Button
                variant="destructive"
                onClick={handleCancelReminderJob}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel Sending
              </Button>
            ) : reminderJobStatus && (reminderJobStatus.status === "completed" || reminderJobStatus.status === "cancelled" || reminderJobStatus.status === "failed") ? (
              <Button onClick={() => {
                setReminderJobId(null);
                setReminderJobStatus(null);
                setReminderDialogOpen(false);
              }}>
                Close
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setReminderDialogOpen(false)}
                  disabled={sendingReminders}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendReminders}
                  disabled={sendingReminders || loadingRecipients || reminderRecipients.reduce((sum, c) => sum + c.representatives.filter(r => r.selected).length, 0) === 0}
                >
                  {sendingReminders ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send
                    </>
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Response Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open);
        if (!open) {
          setResponseToEdit(null);
          setEditingField(null);
          setEditingFieldValue("");
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Form Response</DialogTitle>
            <DialogDescription>
              Make adjustments to this form submission. Changes will be saved immediately when you click Save.
            </DialogDescription>
          </DialogHeader>
          {responseToEdit && (() => {
            const responseVersion = isAllVersions
              ? versions.find(v => {
                  const versionId = typeof responseToEdit.form_version_id === "string"
                    ? responseToEdit.form_version_id
                    : (responseToEdit.form_version_id as { id?: string })?.id;
                  return v.id === versionId;
                })
              : selectedVersion;
            // Use allVersionsFields so we show master-degrees (not old checkbox) when viewing responses
            const schemaFields = responseVersion?.schema?.fields ?? [];
            const fields: FormField[] = allVersionsFields.length > 0
              ? allVersionsFields.map(f => ({ ...f, type: f.type as FormField["type"] }))
              : schemaFields.length > 0
                ? schemaFields
                : [];
            const filteredFields = fields.filter(field => {
              if (responseVersion?.metadata?.is_event_registration && field.name === "email" && field.type === "email") return false;
              return true;
            });
            const isCompanyForm = responseVersion?.metadata?.is_company_form && responseVersion?.metadata?.event_id;

            // Group fields by layout rows (same as public form)
            const rows: FormField[][] = [];
            let currentRow: FormField[] = [];
            let currentRowWidth = 0;
            filteredFields.forEach((field) => {
              const layout = field.layout || "full";
              const width = layout === "half" ? 0.5 : layout === "third" ? 1 / 3 : layout === "two-thirds" ? 2 / 3 : 1;
              if (currentRowWidth + width > 1 && currentRow.length > 0) {
                rows.push(currentRow);
                currentRow = [];
                currentRowWidth = 0;
              }
              currentRow.push(field);
              currentRowWidth += width;
              if (currentRowWidth >= 1 || layout === "full") {
                rows.push(currentRow);
                currentRow = [];
                currentRowWidth = 0;
              }
            });
            if (currentRow.length > 0) rows.push(currentRow);

            const getColSpanClass = (layout: string) => {
              switch (layout) {
                case "half": return "md:col-span-6";
                case "third": return "md:col-span-4";
                case "two-thirds": return "md:col-span-8";
                default: return "md:col-span-12";
              }
            };

            return (
              <div className="space-y-6 py-4">
                {isCompanyForm && (
                  <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                    <h4 className="font-medium">Submitter Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-submitter-first">First Name</Label>
                        <Input
                          id="edit-submitter-first"
                          value={editSubmitterInfo.first_name}
                          onChange={(e) => setEditSubmitterInfo(prev => ({ ...prev, first_name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-submitter-last">Last Name</Label>
                        <Input
                          id="edit-submitter-last"
                          value={editSubmitterInfo.last_name}
                          onChange={(e) => setEditSubmitterInfo(prev => ({ ...prev, last_name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-1">
                        <Label htmlFor="edit-submitter-email">Email</Label>
                        <Input
                          id="edit-submitter-email"
                          type="email"
                          value={editSubmitterInfo.email}
                          onChange={(e) => setEditSubmitterInfo(prev => ({ ...prev, email: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  <h4 className="font-medium">Form Data</h4>
                  {rows.map((row, rowIndex) => (
                    <div key={`row-${rowIndex}`} className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      {row.map((field) => {
                        const layout = field.layout || "full";
                        const imageUrl = field.image ? getDirectusImageUrl(field.image) : null;
                        const isEditing = responseToEdit && editingField?.responseId === responseToEdit.id && editingField?.fieldName === field.name;
                        const fieldValue = editFormData[field.name];
                        return (
                          <div key={field.id} className={`space-y-2 ${getColSpanClass(layout)}`}>
                            <div className="flex items-center justify-between gap-2">
                              <Label htmlFor={field.id}>
                                {field.label}
                                {field.required && <span className="text-destructive ml-1">*</span>}
                              </Label>
                              {!isEditing && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-muted-foreground hover:text-foreground shrink-0"
                                  onClick={() => handleInlineEditStart(responseToEdit!.id, field.name, fieldValue, field.type)}
                                  title="Replace with text"
                                >
                                  <Pencil className="h-3 w-3 mr-1" />
                                  Edit
                                </Button>
                              )}
                            </div>
                            {field.description && (
                              <p className="text-sm text-muted-foreground">{field.description}</p>
                            )}
                            {imageUrl && (
                              <div className="relative w-full h-48 bg-muted rounded-md overflow-hidden border">
                                <NextImage src={imageUrl} alt={field.label || "Field image"} fill className="object-contain" />
                              </div>
                            )}
                            {isEditing ? (
                              <div className="space-y-2">
                                <Textarea
                                  value={editingFieldValue}
                                  onChange={(e) => setEditingFieldValue(e.target.value)}
                                  className="min-h-[80px] text-sm"
                                  placeholder="Enter new value to replace..."
                                  autoFocus
                                />
                                <div className="flex gap-1">
                                  <Button size="sm" variant="default" onClick={handleInlineEditSave}>
                                    <Check className="h-3 w-3 mr-1" />
                                    Replace
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={handleInlineEditCancel}>
                                    <X className="h-3 w-3 mr-1" />
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <FormFieldRenderer
                                field={field}
                                value={fieldValue}
                                onChange={(v) => setEditFormData(prev => ({ ...prev, [field.name]: v }))}
                                disabled={false}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={editing}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={editing}>
              {editing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Scanning columns config dialog */}
      <Dialog open={scanningColumnsDialogOpen} onOpenChange={setScanningColumnsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Scanning columns</DialogTitle>
            <DialogDescription>
              Select which form fields to use for the scanning system. Column options come from all versions; when grouped, each version is resolved by matching label or name. Saved to all event registration versions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {(["university", "faculty", "master", "year_of_study"] as const).map((key) => (
              <div key={key} className="space-y-2">
                <Label>
                  {key === "university" && "University"}
                  {key === "faculty" && "Faculty"}
                  {key === "master" && "Master"}
                  {key === "year_of_study" && "Year of study"}
                </Label>
                <Select
                  value={scanningColumns[key] ?? "__none__"}
                  onValueChange={(v) => setScanningColumns(prev => ({ ...prev, [key]: v === "__none__" ? undefined : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a column..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {allVersionsFields.filter((f: FormField) => f.name && f.name !== "__none__").map((f: FormField) => (
                      <SelectItem key={f.id} value={f.name}>
                        {f.label || f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScanningColumnsDialogOpen(false)} disabled={savingScanningColumns}>
              Cancel
            </Button>
            <Button
              disabled={savingScanningColumns}
              onClick={async () => {
                const eventRegVersions = versions.filter(v => (v.metadata as { is_event_registration?: boolean })?.is_event_registration);
                const versionsToUpdate = isAllVersions ? eventRegVersions : [versions.find(v => v.id === selectedVersionId) ?? versions[0]].filter(Boolean) as FormVersion[];

                if (versionsToUpdate.length === 0) return;
                setSavingScanningColumns(true);
                try {
                  for (const version of versionsToUpdate) {
                    const meta = (version.metadata ?? {}) as Record<string, unknown>;
                    const versionScanningColumns: Record<string, string> = {};
                    for (const slot of ["university", "faculty", "master", "year_of_study"] as const) {
                      const selectedName = scanningColumns[slot];
                      if (!selectedName || selectedName === "__none__") continue;
                      const selectedField = allVersionsFields.find((f: FormField) => f.name === selectedName);
                      const selectedLabel = selectedField?.label || selectedField?.name || selectedName;
                      const versionFields = version.schema?.fields ?? [];
                      const byName = versionFields.find((f: FormField) => f.name === selectedName);
                      const byLabel = versionFields.find((f: FormField) => (f.label || f.name) === selectedLabel);
                      const resolved = byName?.name ?? byLabel?.name;
                      if (resolved) versionScanningColumns[slot] = resolved;
                    }
                    await updateFormVersionAction(version.id, {
                      metadata: { ...meta, scanning_columns: versionScanningColumns },
                    });
                    setVersions(prev => prev.map(v =>
                      v.id === version.id
                        ? { ...v, metadata: { ...meta, scanning_columns: versionScanningColumns } }
                        : v
                    ));
                  }
                  setScanningColumnsDialogOpen(false);
                } catch (err) {
                  console.error("Failed to save scanning columns:", err);
                } finally {
                  setSavingScanningColumns(false);
                }
              }}
            >
              {savingScanningColumns ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

function formatFieldValue(
  value: unknown,
  fieldType: string,
  ctx?: { masters?: Master[]; faculties?: FacultyItem[] }
): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic">-</span>;
  }

  if (fieldType === "master-degrees") {
    const items = Array.isArray(value) ? value : (value != null && value !== "" ? [value] : []);
    if (items.length === 0) return <span className="text-muted-foreground italic">-</span>;
    const masters = ctx?.masters ?? [];
    const faculties = ctx?.faculties ?? [];
    return (
      <div className="flex flex-col gap-1">
        {items.map((v, idx) => {
          const label = resolveMasterDegreeValueToDisplayLabel(v, masters, faculties);
          return (
            <div
              key={idx}
              className="flex items-center gap-2 rounded px-2 py-1 bg-muted text-muted-foreground"
            >
              <Check className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-sm">{label || String(v)}</span>
            </div>
          );
        })}
      </div>
    );
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

  if (fieldType === "linkedin") {
    const url = String(value).trim();
    if (!url) return <span className="text-muted-foreground italic">-</span>;
    const isLinkedIn = /^https?:\/\/(www\.)?linkedin\.com\/in\/[\w-]+\/?(\?.*)?$/i.test(url);
    if (isLinkedIn) {
      return (
        <a
          href={url.startsWith("http") ? url : `https://${url}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          {url}
        </a>
      );
    }
    return <span>{url}</span>;
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


