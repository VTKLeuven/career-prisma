"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchFormByIdAction, fetchFormVersionsAction, fetchFormResponsesAction, fetchFormResponsesTotalCountAction, fetchAllFormResponsesAction, fetchFirstFormResponseAction, fetchLatestFormResponseAction, deleteFormResponseAction, initializeAttendantUuidsAction, fetchFormResponsesForAllVersionsAction, fetchFormResponsesTotalCountForAllVersionsAction, fetchFirstFormResponseForAllVersionsAction, fetchLatestFormResponseForAllVersionsAction, fetchAllFormResponsesForAllVersionsAction } from "@/app/actions/forms";
import { fetchCompaniesForEventAction } from "@/app/actions/companies";
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
import { ArrowLeft, Download, Eye, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, QrCode, Loader2, Mail, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { FormVersion, FormResponse } from "@/lib/schema";
import { formatDateBE, formatDateTimeBE } from "@/lib/date-utils";

export default function FormResponsesPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.formId as string;

  const [form, setForm] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [versions, setVersions] = useState<FormVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>("");
  const [isAllVersions, setIsAllVersions] = useState(true); // Default to all versions
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [allVersionsFields, setAllVersionsFields] = useState<Array<{ id: string; name: string; label: string; type: string }>>([]);
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

  // Collect all unique fields from all versions, filtering out fields with no responses
  useEffect(() => {
    if (versions.length > 0 && responses.length > 0) {
      const fieldMap = new Map<string, { id: string; name: string; label: string; type: string }>();
      versions.forEach(version => {
        if (version.schema?.fields) {
          version.schema.fields.forEach(field => {
            if (!fieldMap.has(field.name)) {
              fieldMap.set(field.name, {
                id: field.id,
                name: field.name,
                label: field.label || field.name,
                type: field.type,
              });
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
      // If no responses yet, show all fields
      const fieldMap = new Map<string, { id: string; name: string; label: string; type: string }>();
      versions.forEach(version => {
        if (version.schema?.fields) {
          version.schema.fields.forEach(field => {
            if (!fieldMap.has(field.name)) {
              fieldMap.set(field.name, {
                id: field.id,
                name: field.name,
                label: field.label || field.name,
                type: field.type,
              });
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

  const handleSendReminders = async () => {
    if (!form) return;
    
    // Find the version to use for sending reminders
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

    // Get selected recipients
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
    try {
      const response = await fetch(`/api/admin/forms/${formId}/send-reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formVersionId: versionToUse.id,
          recipients: selectedRecipients,
          subject: reminderSubject,
          content: reminderContent,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send reminders');
      }

      const result = await response.json();
      alert(`Successfully sent ${result.sent} reminder email(s). ${result.failed > 0 ? `${result.failed} failed.` : ''}`);
      setReminderDialogOpen(false);
    } catch (error) {
      console.error("Error sending reminders:", error);
      alert(`Failed to send reminders: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSendingReminders(false);
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

    const csv = [headerRow, ...dataRows]
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

    const csv = [headerRow, ...dataRows]
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
              {viewMode === "incomplete" && versions.some(v => v.metadata?.is_company_form) && incompleteCompanies.length > 0 && (
                <Button
                  variant="outline"
                  onClick={handleOpenReminderDialog}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Reminders
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
                                    // Get the field value from response data, or NA if not present
                                    const fieldValue = response.data?.[field.name];
                                    const fieldType = field.type;
                                    return (
                                      <TableCell key={field.name}>
                                        {fieldValue !== null && fieldValue !== undefined
                                          ? formatFieldValue(fieldValue, fieldType)
                                          : <span className="text-muted-foreground italic">NA</span>}
                                      </TableCell>
                                    );
                                  })}
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
                                  <TableCell key={field.name}>
                                    {formatFieldValue(response.data[field.name], field.type)}
                                  </TableCell>
                                ))
                            )}
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

      {/* Send Reminders Dialog */}
      <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send Reminder Emails</DialogTitle>
            <DialogDescription>
              Customize the email and select which companies/representatives should receive the reminder
            </DialogDescription>
          </DialogHeader>
          
          {loadingRecipients ? (
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
                        const allSelected = company.representatives.length > 0 && selectedCount === company.representatives.length;
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
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send
                </>
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


