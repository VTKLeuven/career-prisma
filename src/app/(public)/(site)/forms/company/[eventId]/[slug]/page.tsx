"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchCompanyFormsForEventAction, fetchCompanyFormBySlugAndEventAction, submitFormResponseAction, fetchLatestCompanyFormResponseAction } from "@/app/actions/forms";
import { fetchCompanyByIdAction, fetchCompaniesForEventAction } from "@/app/actions/companies";
import { fetchEventsAction } from "@/app/actions/events";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, Download } from "lucide-react";
import type { FormField, FormSchema, FormResponse } from "@/lib/schema";
import { formatDateBE, formatDateTimeBE } from "@/lib/date-utils";
import { getDirectusImageUrl } from "@/components/Images";
import NextImage from "next/image";
import type { Company, CareerEvent } from "@/lib/schema";

type CompanyForm = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  metadata?: {
    deadline?: string;
    max_entries?: number;
    is_company_form?: boolean;
    is_compulsory?: boolean;
    event_id?: string;
    option_ids?: string[];
    send_company_form_email?: boolean;
    company_form_email_subject?: string;
    company_form_email_content?: string;
    [key: string]: unknown;
  };
  activeVersion: {
    id: string;
    version_number: number;
    schema: FormSchema;
  };
};

// Helper function to count words
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

export default function CompanyFormPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  const slug = params.slug as string;

  const [form, setForm] = useState<CompanyForm | null>(null);
  const [event, setEvent] = useState<CareerEvent | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingResponse, setLoadingResponse] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [availableCompanies, setAvailableCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [companySearchTerm, setCompanySearchTerm] = useState("");
  const [isCompanySearchOpen, setIsCompanySearchOpen] = useState(false);
  const [submitterFirstName, setSubmitterFirstName] = useState("");
  const [submitterLastName, setSubmitterLastName] = useState("");
  const [submitterEmail, setSubmitterEmail] = useState("");
  const [existingResponse, setExistingResponse] = useState<FormResponse | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [authCompanyId, setAuthCompanyId] = useState<string | null>(null);
  const [authUserName, setAuthUserName] = useState<string | null>(null);
  const [authUserEmail, setAuthUserEmail] = useState<string | null>(null);

  // Load authenticated company/user info from /api/user/check (public side doesn't use UserProvider)
  useEffect(() => {
    const ts = Date.now();
    fetch(`/api/user/check?t=${ts}`, {
      method: "GET",
      cache: "no-store",
      credentials: "include",
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const rep = data?.companyRep as any;
        if (rep?.authenticated && rep.company && typeof rep.company === "object" && rep.company.id) {
          setAuthCompanyId(rep.company.id as string);
          setAuthUserName(rep.name ?? null);
          if (rep.email) {
            setAuthUserEmail(rep.email as string);
            // Also set submitterEmail immediately so it's available for display
            setSubmitterEmail(rep.email as string);
          }
        }
      })
      .catch((err) => {
        console.error("[CompanyFormPage] Error checking auth status:", err);
      });
  }, []);

  // Load form and event data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Load event
        const events = await fetchEventsAction();
        const foundEvent = events?.find((e) => e.id === eventId);
        setEvent(foundEvent || null);

        if (!foundEvent) {
          setLoading(false);
          return;
        }

        // If user is logged in (via authCompanyId), load their company
        let userCompany: Company | null = null;
        if (authCompanyId) {
          userCompany = await fetchCompanyByIdAction(authCompanyId);
          if (userCompany) {
            setCompany(userCompany);
            setSelectedCompanyId(userCompany.id);
            setCompanySearchTerm(userCompany.name);
            
            // Pre-fill submitter info from logged-in user
            if (authUserName) {
              const nameParts = authUserName.trim().split(/\s+/);
              setSubmitterFirstName(nameParts[0] || "");
              setSubmitterLastName(nameParts.slice(1).join(' ') || "");
            }
            if (authUserEmail) {
              setSubmitterEmail(authUserEmail);
            }
          }
        } else {
          // Load available companies for non-logged-in users
          const companies = await fetchCompaniesForEventAction(eventId, true);
          setAvailableCompanies(companies);
        }

        // For logged-in users, try fetching forms filtered by their company's options first
        // If not found, fall back to direct fetch (for testing/admin purposes)
        // For non-logged-in users, fetch the form directly by slug and event
        if (authCompanyId && userCompany) {
          // Extract option IDs, handling junction table format: { career_event_option_id: CareerEventOption }
          const companyOptionIds = userCompany.options
            ?.map((opt) => {
              // Handle string IDs directly
              if (typeof opt === 'string') return opt;
              
              // Handle junction table format: { career_event_option_id: CareerEventOption }
              if (opt && typeof opt === 'object' && 'career_event_option_id' in opt) {
                const junction = opt as { career_event_option_id: unknown };
                const option = junction.career_event_option_id;
                if (typeof option === 'string') return option;
                if (option && typeof option === 'object' && 'id' in option) {
                  return (option as { id: string }).id;
                }
                return null;
              }
              
              // Handle direct option object with id
              if (opt && typeof opt === 'object' && 'id' in opt) return (opt as { id: string }).id;
              
              return null;
            })
            .filter((id): id is string => id !== null) || [];

          const forms = await fetchCompanyFormsForEventAction(eventId, companyOptionIds);
          const foundForm = forms.find((f) => f.slug === slug);
          
          // If not found in filtered list, try direct fetch (for testing/admin purposes)
          if (!foundForm) {
            const directForm = await fetchCompanyFormBySlugAndEventAction(eventId, slug);
            setForm(directForm);
          } else {
            setForm(foundForm);
          }
        } else {
          // For non-logged-in users, fetch form directly by slug and event
          // They'll select a company and we'll verify options when they submit
          const directForm = await fetchCompanyFormBySlugAndEventAction(eventId, slug);
          setForm(directForm);
        }
        } catch (error) {
          console.error("Error loading form:", error);
          // Try direct fetch as last resort even if there was an error
          try {
            const directForm = await fetchCompanyFormBySlugAndEventAction(eventId, slug);
            setForm(directForm ?? null);
          } catch (directError) {
            console.error("Error in direct fetch fallback:", directError);
            setForm(null);
          }
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [eventId, slug, authCompanyId, authUserName, authUserEmail]);

  // Load latest existing response for this form/company (if any) and prefill data
  useEffect(() => {
    async function loadExistingResponse() {
      console.log("[CompanyFormPage] loadExistingResponse - Starting", {
        formId: form?.id,
        formVersionId: form?.activeVersion?.id,
        companyId: company?.id,
        selectedCompanyId,
      });

      if (!form?.id || !form.activeVersion?.id) {
        console.log("[CompanyFormPage] loadExistingResponse - Missing form or version, skipping");
        setLoadingResponse(false);
        return;
      }

      // Prefer logged-in company from state, then from auth, then manually selected company
      const companyId = company?.id || authCompanyId || selectedCompanyId;
      if (!companyId) {
        console.log("[CompanyFormPage] loadExistingResponse - No company ID, skipping", {
          companyStateId: company?.id,
          authCompanyId,
          selectedCompanyId,
        });
        setExistingResponse(null);
        setLoadingResponse(false);
        return;
      }

      setLoadingResponse(true);

      console.log("[CompanyFormPage] loadExistingResponse - Fetching response", {
        formId: form.id,
        formVersionId: form.activeVersion.id,
        companyId,
      });

      try {
        const response = await fetchLatestCompanyFormResponseAction(form.id, form.activeVersion.id, companyId) as FormResponse | null;
        console.log("[CompanyFormPage] loadExistingResponse - Response received", {
          hasResponse: !!response,
          responseId: response?.id,
          dataType: typeof response?.data,
          dataPreview: response?.data 
            ? (typeof response.data === 'string' 
                ? (response.data as string).substring(0, 100) 
                : Object.keys(response.data as object)) 
            : null,
        });

        if (response) {
          setExistingResponse(response);

          // Directus may store JSON fields as strings; ensure we always have an object
          const rawData = (response as any).data;
          let parsedData: Record<string, unknown> = {};
          
          console.log("[CompanyFormPage] loadExistingResponse - Parsing data", {
            rawDataType: typeof rawData,
            rawDataIsString: typeof rawData === "string",
            rawDataIsObject: typeof rawData === "object",
            rawDataKeys: typeof rawData === "object" && rawData !== null ? Object.keys(rawData) : null,
          });

          if (rawData) {
            if (typeof rawData === "string") {
              try {
                parsedData = JSON.parse(rawData) as Record<string, unknown>;
                console.log("[CompanyFormPage] loadExistingResponse - Parsed JSON string", {
                  parsedKeys: Object.keys(parsedData),
                  parsedValues: Object.values(parsedData).slice(0, 3),
                });
              } catch (e) {
                console.error("[CompanyFormPage] Failed to parse form response data JSON:", e);
                // Fallback: keep empty object so we don't break the form
                parsedData = {};
              }
            } else if (typeof rawData === "object" && rawData !== null) {
              parsedData = rawData as Record<string, unknown>;
              console.log("[CompanyFormPage] loadExistingResponse - Using object directly", {
                keys: Object.keys(parsedData),
                values: Object.values(parsedData).slice(0, 3),
              });
            }
          }

          console.log("[CompanyFormPage] loadExistingResponse - Setting formData", {
            parsedDataKeys: Object.keys(parsedData),
            parsedDataSize: Object.keys(parsedData).length,
          });
          setFormData(parsedData);
          
          // Pre-fill submitter info from existing response (if not already set from logged-in user)
          if (response.submitter_first_name && !submitterFirstName) {
            setSubmitterFirstName(response.submitter_first_name);
          }
          if (response.submitter_last_name && !submitterLastName) {
            setSubmitterLastName(response.submitter_last_name);
          }
          if (response.submitter_email && !submitterEmail) {
            setSubmitterEmail(response.submitter_email);
          }
          
          // When compulsory, open editor immediately; otherwise start in read-only mode
          setIsEditing(form.metadata?.is_compulsory === true);
          console.log("[CompanyFormPage] loadExistingResponse - Completed successfully, form data set");
        } else {
          console.log("[CompanyFormPage] loadExistingResponse - No existing response found");
          setExistingResponse(null);
          // If there's no existing response, allow editing immediately
          setIsEditing(true);
        }
      } catch (error) {
        console.error("[CompanyFormPage] Error loading existing response:", error);
        setExistingResponse(null);
        setIsEditing(true);
      } finally {
        setLoadingResponse(false);
      }
    }

    loadExistingResponse();
  }, [form?.id, form?.activeVersion?.id, company?.id, authCompanyId, selectedCompanyId]);

  // When a company is selected (for non-logged-in users), verify they have required options
  useEffect(() => {
    async function verifyCompanyOptions() {
      if (!form || !selectedCompanyId || authCompanyId) return; // Skip if logged in or no company selected
      
      try {
        const selectedCompany = await fetchCompanyByIdAction(selectedCompanyId, true);
        if (!selectedCompany) return;
        
        // Extract option IDs, handling junction table format: { career_event_option_id: CareerEventOption }
        const companyOptionIds = selectedCompany.options
          ?.map((opt) => {
            // Handle string IDs directly
            if (typeof opt === 'string') return opt;
            
            // Handle junction table format: { career_event_option_id: CareerEventOption }
            if (opt && typeof opt === 'object' && 'career_event_option_id' in opt) {
              const junction = opt as { career_event_option_id: unknown };
              const option = junction.career_event_option_id;
              if (typeof option === 'string') return option;
              if (option && typeof option === 'object' && 'id' in option) {
                return (option as { id: string }).id;
              }
              return null;
            }
            
            // Handle direct option object with id
            if (opt && typeof opt === 'object' && 'id' in opt) return (opt as { id: string }).id;
            
            return null;
          })
          .filter((id): id is string => id !== null) || [];
        
        const requiredOptionIds = form.metadata?.option_ids || [];
        const hasRequiredOptions = requiredOptionIds.length === 0 || 
          requiredOptionIds.some((optionId) => companyOptionIds.includes(optionId));
        
        if (!hasRequiredOptions) {
          setErrors((prev) => ({
            ...prev,
            company: "Your company does not have the required options for this form",
          }));
        } else {
          setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors.company;
            return newErrors;
          });
        }
      } catch (error) {
        console.error("Error verifying company options:", error);
      }
    }
    
    verifyCompanyOptions();
  }, [selectedCompanyId, form, authCompanyId]);

  // Close company search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.company-search-container')) {
        setIsCompanySearchOpen(false);
      }
    };

    if (isCompanySearchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isCompanySearchOpen]);

  // Close company search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.company-search-container')) {
        setIsCompanySearchOpen(false);
      }
    };

    if (isCompanySearchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isCompanySearchOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!form) return false;

    // If not logged in, require company selection and submitter info
    if (!authCompanyId) {
      if (!selectedCompanyId) {
        newErrors.company = "Please select your company";
      }
      if (!submitterFirstName.trim()) {
        newErrors.submitterFirstName = "Your first name is required";
      }
      if (!submitterLastName.trim()) {
        newErrors.submitterLastName = "Your last name is required";
      }
      if (!submitterEmail.trim()) {
        newErrors.submitterEmail = "Your email is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submitterEmail)) {
        newErrors.submitterEmail = "Please enter a valid email address";
      }
    }

    form.activeVersion.schema.fields.forEach((field) => {
      if (field.required) {
        const value = formData[field.name];
        if (!value || (Array.isArray(value) && value.length === 0)) {
          newErrors[field.name] = `${field.label} is required`;
        }
      }
      
      // Validate word limit for textarea fields
      if (field.type === "textarea" && field.validation?.wordLimit) {
        const value = formData[field.name] as string;
        if (value) {
          const wordCount = countWords(value);
          if (wordCount > field.validation.wordLimit) {
            newErrors[field.name] = `${field.label} exceeds the word limit of ${field.validation.wordLimit} words (${wordCount} words entered)`;
          }
        }
      }

      // Validate LinkedIn profile URL format
      if (field.type === "linkedin") {
        const value = formData[field.name] as string;
        if (value && !/^https?:\/\/(www\.)?linkedin\.com\/in\/[\w-]+\/?(\?.*)?$/i.test(value.trim())) {
          newErrors[field.name] = `${field.label} must be a valid LinkedIn profile URL (e.g. https://linkedin.com/in/username)`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form || !validateForm()) {
      return;
    }

    // Check deadline
    if (form.metadata?.deadline) {
      const deadline = new Date(form.metadata.deadline);
      const now = new Date();
      if (now > deadline) {
        alert(`This form's deadline has passed. The deadline was ${formatDateTimeBE(deadline)}.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      // Prepare submission data (without company/submitter info - those go as separate params)
      const submissionData = { ...formData };

      // Extract first and last name from logged-in user name or form fields
      let firstName: string | undefined;
      let lastName: string | undefined;
      if (authUserName) {
        const nameParts = authUserName.trim().split(/\s+/);
        firstName = nameParts[0] || undefined;
        lastName = nameParts.slice(1).join(' ') || undefined;
      } else if (submitterFirstName || submitterLastName) {
        firstName = submitterFirstName || undefined;
        lastName = submitterLastName || undefined;
      }

      await submitFormResponseAction({
        form_version_id: form.activeVersion.id,
        user_id: undefined, // We don't have user.id in public route
        data: submissionData,
        company_id: authCompanyId || selectedCompanyId || company?.id || undefined,
        submitter_first_name: firstName || submitterFirstName || undefined,
        submitter_last_name: lastName || submitterLastName || undefined,
        submitter_email: authUserEmail || submitterEmail || undefined,
      });

      // After a successful submission, consider this the latest response
      setSubmitted(true);
    } catch (error) {
      console.error("Error submitting form:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to submit form. Please try again.";
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFieldChange = (fieldName: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
    // Clear error for this field
    if (errors[fieldName]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  // Only show full loading screen on initial load, not when loading existing response after company selection
  if (loading) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading form...</p>
        </div>
      </div>
    );
  }

  if (!form || !event) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold mb-2">Form Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The form you&apos;re looking for doesn&apos;t exist or is not available for your company.
              </p>
              <Button onClick={() => router.push("/")}>Go Home</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
              <p className="text-muted-foreground mb-4">
                Your response has been submitted successfully.
              </p>
              <Button onClick={() => router.push("/dashboard")}>Go to Dashboard</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isDeadlinePassed = form.metadata?.deadline
    ? new Date(form.metadata.deadline) < new Date()
    : false;

  return (
    <div className="container mx-auto p-8 max-w-3xl">
      {loadingResponse && (
        <div className="mb-4 p-3 bg-muted/50 border border-border rounded-md flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <p className="text-sm text-muted-foreground">Loading your previous response...</p>
        </div>
      )}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-2xl">{form.name}</CardTitle>
              {form.description && (
                <CardDescription className="mt-2">{form.description}</CardDescription>
              )}
              {event && (
                <CardDescription className="mt-1">Event: {event.name}</CardDescription>
              )}
              {form.metadata?.deadline && (
                <div className="mt-2">
                  <Badge variant="secondary">
                    Deadline: {formatDateTimeBE(form.metadata.deadline)}
                    {isDeadlinePassed && " (Passed)"}
                  </Badge>
                </div>
              )}
            </div>
            {existingResponse && !isEditing && !isDeadlinePassed && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="shrink-0"
              >
                Edit response
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isDeadlinePassed && form.metadata?.deadline && (
            <div className="mb-4 p-4 bg-muted border border-border rounded-md">
              <p className="text-muted-foreground">
                This form&apos;s deadline has passed. Submissions are no longer accepted. The deadline was {formatDateTimeBE(form.metadata.deadline)}.
              </p>
            </div>
          )}
          {/* Show message if not logged in but company has already submitted */}
          {!authCompanyId && existingResponse && !loadingResponse && (
            <div className="mb-4 p-6 bg-muted/50 border border-border rounded-md text-center">
              <p className="text-muted-foreground mb-4">
                Your company has already submitted this form. Please log in to view or edit your response.
              </p>
              <Button asChild>
                <Link href="/login">Log in</Link>
              </Button>
            </div>
          )}
          {(!existingResponse || authCompanyId) && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company info display for logged-in users */}
            {!loading && authCompanyId && company && (
              <div className="space-y-2 p-4 border rounded-md bg-muted/30">
                <h3 className="font-semibold text-sm">Company Information</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Company:</span>
                    <span className="ml-2 font-medium">{company.name}</span>
                  </div>
                  {existingResponse ? (
                    // If there's an existing response, show "Submitted by"
                    authUserName && (
                      <div>
                        <span className="text-muted-foreground">Submitted by:</span>
                        <span className="ml-2 font-medium">{authUserName}</span>
                      </div>
                    )
                  ) : (
                    // If no existing response, show "Submitter name" and "Submitter email" separately
                    <>
                      {authUserName && (
                        <div>
                          <span className="text-muted-foreground">Submitter name:</span>
                          <span className="ml-2 font-medium">{authUserName}</span>
                        </div>
                      )}
                      {(authUserEmail || submitterEmail) && (
                        <div>
                          <span className="text-muted-foreground">Submitter email:</span>
                          <span className="ml-2 font-medium">{authUserEmail || submitterEmail}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
            
            {/* Company selection and submitter info for non-logged-in users */}
            {/* Show only if user is NOT logged in as a company rep (same logic as dashboard) */}
            {!loading && !authCompanyId && (
              <div className="space-y-4 p-4 border rounded-md bg-muted/50">
                <h3 className="font-semibold">Company Information</h3>
                <div className="space-y-2">
                  <Label htmlFor="company-select">Company *</Label>
                  <div className="relative company-search-container">
                    <Input
                      id="company-select"
                      value={companySearchTerm}
                      onChange={(e) => {
                        setCompanySearchTerm(e.target.value);
                        setIsCompanySearchOpen(true);
                        // If the search term matches a company name exactly, select it
                        const matchingCompany = availableCompanies.find(
                          (c) => c.name.toLowerCase() === e.target.value.toLowerCase()
                        );
                        if (matchingCompany) {
                          setSelectedCompanyId(matchingCompany.id);
                        } else if (selectedCompanyId) {
                          // Clear selection if search doesn't match selected company
                          const selectedCompany = availableCompanies.find((c) => c.id === selectedCompanyId);
                          if (!selectedCompany || !selectedCompany.name.toLowerCase().includes(e.target.value.toLowerCase())) {
                            setSelectedCompanyId("");
                          }
                        }
                        if (errors.company) {
                          setErrors((prev) => {
                            const newErrors = { ...prev };
                            delete newErrors.company;
                            return newErrors;
                          });
                        }
                      }}
                      onFocus={() => setIsCompanySearchOpen(true)}
                      placeholder="Search and select your company..."
                      className={errors.company ? "border-destructive" : ""}
                    />
                    {isCompanySearchOpen && availableCompanies.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                        {availableCompanies
                          .filter((company) =>
                            company.name.toLowerCase().includes(companySearchTerm.toLowerCase())
                          )
                          .map((company) => (
                            <button
                              key={company.id}
                              type="button"
                              className="w-full text-left px-4 py-2 hover:bg-muted cursor-pointer"
                              onClick={() => {
                                setSelectedCompanyId(company.id);
                                setCompanySearchTerm(company.name);
                                setIsCompanySearchOpen(false);
                                if (errors.company) {
                                  setErrors((prev) => {
                                    const newErrors = { ...prev };
                                    delete newErrors.company;
                                    return newErrors;
                                  });
                                }
                              }}
                            >
                              {company.name}
                            </button>
                          ))}
                        {availableCompanies.filter((company) =>
                          company.name.toLowerCase().includes(companySearchTerm.toLowerCase())
                        ).length === 0 && (
                          <div className="px-4 py-2 text-sm text-muted-foreground">
                            No companies found
                          </div>
                        )}
                      </div>
                    )}
                    {selectedCompanyId && (
                      <input type="hidden" name="company_id" value={selectedCompanyId} />
                    )}
                  </div>
                  {errors.company && (
                    <p className="text-sm text-destructive">{errors.company}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="submitter-first-name">First Name *</Label>
                    <Input
                      id="submitter-first-name"
                      value={submitterFirstName}
                      onChange={(e) => {
                        setSubmitterFirstName(e.target.value);
                        if (errors.submitterFirstName) {
                          setErrors((prev) => {
                            const newErrors = { ...prev };
                            delete newErrors.submitterFirstName;
                            return newErrors;
                          });
                        }
                      }}
                      className={errors.submitterFirstName ? "border-destructive" : ""}
                    />
                    {errors.submitterFirstName && (
                      <p className="text-sm text-destructive">{errors.submitterFirstName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="submitter-last-name">Last Name *</Label>
                    <Input
                      id="submitter-last-name"
                      value={submitterLastName}
                      onChange={(e) => {
                        setSubmitterLastName(e.target.value);
                        if (errors.submitterLastName) {
                          setErrors((prev) => {
                            const newErrors = { ...prev };
                            delete newErrors.submitterLastName;
                            return newErrors;
                          });
                        }
                      }}
                      className={errors.submitterLastName ? "border-destructive" : ""}
                    />
                    {errors.submitterLastName && (
                      <p className="text-sm text-destructive">{errors.submitterLastName}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="submitter-email">Your Email *</Label>
                  <Input
                    id="submitter-email"
                    type="email"
                    value={submitterEmail}
                    onChange={(e) => {
                      setSubmitterEmail(e.target.value);
                      if (errors.submitterEmail) {
                        setErrors((prev) => {
                          const newErrors = { ...prev };
                          delete newErrors.submitterEmail;
                          return newErrors;
                        });
                      }
                    }}
                    className={errors.submitterEmail ? "border-destructive" : ""}
                  />
                  {errors.submitterEmail && (
                    <p className="text-sm text-destructive">{errors.submitterEmail}</p>
                  )}
                </div>
              </div>
            )}

            {/* Form Fields */}
            {(() => {
              // Group fields by layout rows
              const rows: FormField[][] = [];
              let currentRow: FormField[] = [];
              let currentRowWidth = 0;

              form.activeVersion.schema.fields.forEach((field) => {
                const layout = field.layout || 'full';
                const width = layout === 'half' ? 0.5 : layout === 'third' ? 1/3 : layout === 'two-thirds' ? 2/3 : 1;

                if (currentRowWidth + width > 1 && currentRow.length > 0) {
                  rows.push(currentRow);
                  currentRow = [];
                  currentRowWidth = 0;
                }

                currentRow.push(field);
                currentRowWidth += width;

                if (currentRowWidth >= 1 || layout === 'full') {
                  rows.push(currentRow);
                  currentRow = [];
                  currentRowWidth = 0;
                }
              });

              if (currentRow.length > 0) {
                rows.push(currentRow);
              }

              const getColSpanClass = (layout: string) => {
                switch (layout) {
                  case 'half': return 'md:col-span-6';
                  case 'third': return 'md:col-span-4';
                  case 'two-thirds': return 'md:col-span-8';
                  default: return 'md:col-span-12';
                }
              };

              return rows.map((row, rowIndex) => (
                <div key={`row-${rowIndex}`} className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {row.map((field) => {
                    const layout = field.layout || 'full';
                    const imageUrl = field.image ? getDirectusImageUrl(field.image) : null;
                    
                    return (
                      <div key={field.id} className={`space-y-2 ${getColSpanClass(layout)}`}>
                        <Label htmlFor={field.id}>
                          {field.label}
                          {field.required && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        {field.description && (
                          <p className="text-sm text-muted-foreground">{field.description}</p>
                        )}
                        {imageUrl && (
                          <div className="relative w-full h-48 bg-muted rounded-md overflow-hidden border">
                            <NextImage
                              src={imageUrl}
                              alt={field.label || "Field image"}
                              fill
                              className="object-contain"
                            />
                          </div>
                        )}
                        <FormFieldRenderer
                          field={field}
                          value={formData[field.name]}
                          onChange={(value) => handleFieldChange(field.name, value)}
                          error={errors[field.name]}
                          disabled={isDeadlinePassed || (!!existingResponse && !isEditing)}
                        />
                        {errors[field.name] && (
                          <p className="text-sm text-destructive">{errors[field.name]}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ));
            })()}

            {(!existingResponse || isEditing) && (
              <div className="flex justify-end gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (existingResponse && !submitting) {
                      // Reset to previously submitted data and exit edit mode
                      setFormData(existingResponse.data || {});
                      setIsEditing(false);
                    } else {
                      router.push("/dashboard");
                    }
                  }}
                >
                  {existingResponse ? "Cancel editing" : "Cancel"}
                </Button>
                <Button type="submit" disabled={submitting || isDeadlinePassed}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    existingResponse ? "Save changes" : "Submit"
                  )}
                </Button>
              </div>
            )}
          </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Component to display file info with preview and download link
function FileDisplay({ fileId, index }: { fileId: string; index?: number }) {
  const [isImage, setIsImage] = useState<boolean | null>(null);
  const downloadUrl = `/api/files/${fileId}`;

  return (
    <div className="flex flex-col gap-2">
      {isImage !== false && (
        <div className="relative w-24 h-24 rounded-lg border bg-muted overflow-hidden flex items-center justify-center">
          <img
            src={downloadUrl}
            alt="File preview"
            className="max-w-full max-h-full object-contain"
            onLoad={() => setIsImage(true)}
            onError={() => setIsImage(false)}
          />
        </div>
      )}
      <a
        href={downloadUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline flex items-center gap-1 w-fit"
      >
        <Download className="h-3 w-3 shrink-0" />
        <span>View/Download File</span>
      </a>
    </div>
  );
}

// Reuse FormFieldRenderer from public form page
function FormFieldRenderer({
  field,
  value,
  onChange,
  error,
  disabled = false,
}: {
  field: FormField;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  disabled?: boolean;
}) {
  const inputClassName = error ? "border-destructive" : "";

  switch (field.type) {
    case "textarea":
      const textareaValue = (value as string) || "";
      const wordLimit = field.validation?.wordLimit;
      const wordCount = countWords(textareaValue);
      const isOverLimit = wordLimit && wordCount > wordLimit;
      
      return (
        <div className="space-y-2">
          <Textarea
            id={field.id}
            name={field.name}
            value={textareaValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className={isOverLimit ? "border-destructive" : inputClassName}
            rows={4}
            disabled={disabled}
          />
          {wordLimit && (
            <div className="flex items-center justify-between text-xs">
              <span className={isOverLimit ? "text-destructive" : "text-muted-foreground"}>
                {wordCount} / {wordLimit} words
              </span>
              {isOverLimit && (
                <span className="text-destructive font-medium">
                  Word limit exceeded
                </span>
              )}
            </div>
          )}
        </div>
      );

    case "email":
      return (
        <Input
          id={field.id}
          name={field.name}
          type="email"
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          className={inputClassName}
          disabled={disabled}
        />
      );

    case "number":
      return (
        <Input
          id={field.id}
          name={field.name}
          type="number"
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          className={inputClassName}
          min={field.validation?.min}
          max={field.validation?.max}
          disabled={disabled}
        />
      );

    case "date":
      return (
        <Input
          id={field.id}
          name={field.name}
          type="date"
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          className={inputClassName}
          disabled={disabled}
        />
      );

    case "date-range":
      const dateRangeValue = value as { start?: string; end?: string } || {};
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor={`${field.id}-start`} className="text-sm">Start Date</Label>
            <Input
              id={`${field.id}-start`}
              name={`${field.name}_start`}
              type="date"
              value={dateRangeValue.start || ""}
              onChange={(e) => onChange({ ...dateRangeValue, start: e.target.value })}
              required={field.required}
              className={inputClassName}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${field.id}-end`} className="text-sm">End Date</Label>
            <Input
              id={`${field.id}-end`}
              name={`${field.name}_end`}
              type="date"
              value={dateRangeValue.end || ""}
              onChange={(e) => {
                const newValue = { ...dateRangeValue, end: e.target.value };
                onChange(newValue);
              }}
              required={field.required}
              min={dateRangeValue.start || undefined}
              className={inputClassName}
              disabled={disabled}
            />
          </div>
        </div>
      );

    case "time":
      return (
        <Input
          id={field.id}
          name={field.name}
          type="time"
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          className={inputClassName}
          disabled={disabled}
        />
      );

    case "linkedin":
      return (
        <Input
          id={field.id}
          name={field.name}
          type="url"
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || "https://linkedin.com/in/username"}
          required={field.required}
          className={inputClassName}
          disabled={disabled}
        />
      );

    case "select":
      return (
        <Select
          value={(value as string) || ""}
          onValueChange={onChange}
          required={field.required}
          disabled={disabled}
        >
          <SelectTrigger id={field.id} className={inputClassName}>
            <SelectValue placeholder={field.placeholder || "Select an option"} />
          </SelectTrigger>
          <SelectContent>
            {(field.options || []).map((option, index) => (
              <SelectItem key={index} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "checkbox":
      return (
        <div className="space-y-2">
          {(field.options || []).map((option, index) => {
            const checked = Array.isArray(value) && value.includes(option);
            return (
              <div key={index} className="flex items-center space-x-2">
                <Checkbox
                  id={`${field.id}-${index}`}
                  checked={checked}
                  onCheckedChange={(isChecked) => {
                    const currentValues = (Array.isArray(value) ? value : []) as string[];
                    if (isChecked) {
                      onChange([...currentValues, option]);
                    } else {
                      onChange(currentValues.filter((v) => v !== option));
                    }
                  }}
                  disabled={disabled}
                />
                <Label
                  htmlFor={`${field.id}-${index}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {option}
                </Label>
              </div>
            );
          })}
        </div>
      );

    case "radio":
      return (
        <RadioGroup
          value={(value as string) || ""}
          onValueChange={onChange}
          required={field.required}
          disabled={disabled}
        >
          {(field.options || []).map((option, index) => (
            <div key={index} className="flex items-center space-x-2">
              <RadioGroupItem
                id={`${field.id}-${index}`}
                value={option}
                disabled={disabled}
              />
              <Label
                htmlFor={`${field.id}-${index}`}
                className="text-sm font-normal cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
              >
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>
      );

    case "file":
      const maxFileSize = field.validation?.maxFileSize || 50 * 1024 * 1024;
      const maxFileSizeMB = Math.round(maxFileSize / (1024 * 1024));
      const isMultiple = field.multiple || false;
      
      // If editing is disabled, only show the file display (if there's a value)
      if (disabled) {
        if (!value) {
          return <span className="text-muted-foreground italic">No file uploaded</span>;
        }
        return (
          <div className="space-y-2">
            {isMultiple && Array.isArray(value) ? (
              <div className="space-y-2">
                <p className="text-muted-foreground font-medium">✓ {value.length} file(s) uploaded:</p>
                <ul className="space-y-1">
                  {value.map((id, idx) => {
                    const fileId = typeof id === 'string' ? id : String(id);
                    return (
                      <li key={idx} className="flex items-center gap-2">
                        <FileDisplay fileId={fileId} index={idx} />
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-medium">✓ File uploaded:</span>
                <FileDisplay fileId={typeof value === 'string' ? value : String(value)} />
              </div>
            )}
          </div>
        );
      }
      
      return (
        <div className="space-y-2">
          <Input
            id={field.id}
            name={field.name}
            type="file"
            multiple={isMultiple}
            disabled={disabled}
            required={field.required && !value}
            onChange={async (e) => {
              const files = Array.from(e.target.files || []);
              if (files.length === 0) return;

              const oversizedFiles = files.filter(file => file.size > maxFileSize);
              if (oversizedFiles.length > 0) {
                alert(`Some files exceed the maximum size of ${maxFileSizeMB}MB. Please select smaller files.`);
                e.target.value = '';
                return;
              }

              if (field.validation?.allowedFileTypes && field.validation.allowedFileTypes.length > 0) {
                const invalidFiles = files.filter(file => 
                  !field.validation!.allowedFileTypes!.some(type => 
                    file.type === type || file.name.toLowerCase().endsWith(type.replace('*', ''))
                  )
                );
                if (invalidFiles.length > 0) {
                  alert(`Some files have invalid types. Allowed types: ${field.validation.allowedFileTypes.join(', ')}`);
                  e.target.value = '';
                  return;
                }
              }

              try {
                const uploadedIds: string[] = [];
                
                for (const file of files) {
                  console.log('[Form] Starting upload for file:', file.name, 'Size:', file.size, 'bytes');
                  const formData = new FormData();
                  formData.append('file', file);

                  let response: Response;
                  try {
                    response = await fetch('/api/upload', {
                      method: 'POST',
                      body: formData,
                    });
                  } catch (fetchError) {
                    console.error('[Form] Fetch error (network/connection issue):', fetchError);
                    const fetchErrorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
                    if (fetchErrorMessage.includes('Failed to fetch') || fetchErrorMessage.includes('NetworkError')) {
                      throw new Error('Network error: Unable to connect to the server. This may indicate the file is too large for the server configuration or there is a network issue.');
                    }
                    throw new Error(`Upload failed: ${fetchErrorMessage}`);
                  }

                  if (!response.ok) {
                    // Try to get error message from response
                    let errorMessage = 'Upload failed';
                    try {
                      const errorData = await response.json();
                      errorMessage = errorData.error || errorData.message || errorData.details || `Upload failed with status ${response.status}`;
                      console.error('[Form] Upload error response:', errorData);
                    } catch (jsonError) {
                      // If JSON parsing fails, try to get text
                      try {
                        const errorText = await response.text();
                        errorMessage = errorText || `Upload failed with status ${response.status}`;
                        console.error('[Form] Upload error text:', errorText);
                      } catch (textError) {
                        errorMessage = `Upload failed with status ${response.status}: ${response.statusText}`;
                        console.error('[Form] Could not parse error response');
                      }
                    }
                    throw new Error(errorMessage);
                  }

                  const result = await response.json();
                  if (!result.id) {
                    throw new Error('Upload succeeded but no file ID was returned');
                  }
                  console.log('[Form] Upload successful, file ID:', result.id);
                  uploadedIds.push(result.id);
                }

                if (isMultiple) {
                  onChange(uploadedIds);
                } else {
                  onChange(uploadedIds[0]);
                }
              } catch (error) {
                console.error('File upload error:', error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                if (errorMessage.includes('permission') || errorMessage.includes('FORBIDDEN')) {
                  alert('File upload failed: Directus permissions not configured.\n\nPlease ask an administrator to enable CREATE permission for Public role on directus_files collection.');
                } else {
                  alert(`Failed to upload file: ${errorMessage}. Please try again or contact support.`);
                }
                e.target.value = '';
              }
            }}
            className={inputClassName}
          />
          <p className="text-xs text-muted-foreground">
            Maximum file size: {maxFileSizeMB}MB{isMultiple ? ' (multiple files allowed)' : ''}
          </p>
          {value ? (
            <div className="text-sm space-y-2">
              {isMultiple && Array.isArray(value) ? (
                <div className="space-y-2">
                  <p className="text-muted-foreground font-medium">✓ {value.length} file(s) uploaded:</p>
                  <ul className="space-y-1">
                    {value.map((id, idx) => {
                      const fileId = typeof id === 'string' ? id : String(id);
                      return (
                        <li key={idx} className="flex items-center gap-2">
                          <FileDisplay fileId={fileId} index={idx} />
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-medium">✓ File uploaded:</span>
                  <FileDisplay fileId={typeof value === 'string' ? value : String(value)} />
                </div>
              )}
            </div>
          ) : null}
        </div>
      );

    case "text":
    default:
      return (
        <Input
          id={field.id}
          name={field.name}
          type="text"
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          className={inputClassName}
          disabled={disabled}
        />
      );
  }
}

