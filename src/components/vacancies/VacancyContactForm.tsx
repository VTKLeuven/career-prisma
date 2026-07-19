"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Paperclip, X, Send, CheckCircle2 } from "lucide-react";
import { submitVacancyContactAction } from "@/app/actions/vacancy-contact";

interface VacancyContactFormProps {
  vacancyId: string;
  companyName: string;
  prefillName?: string;
  prefillEmail?: string;
}

export function VacancyContactForm({
  vacancyId,
  companyName,
  prefillName,
  prefillEmail,
}: VacancyContactFormProps) {
  const [name, setName] = useState(prefillName ?? "");
  const [email, setEmail] = useState(prefillEmail ?? "");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files ?? []);
    setFiles((prev) => [...prev, ...newFiles]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("vacancyId", vacancyId);
      formData.append("name", name);
      formData.append("email", email);
      formData.append("subject", subject);
      formData.append("message", message);
      for (const file of files) {
        formData.append("files", file);
      }

      const result = await submitVacancyContactAction(formData);

      if (!result.success) {
        throw new Error(result.error || "Failed to send message");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const fieldClass =
    "border-neutral-200 focus-visible:border-vtk-blue/40 focus-visible:ring-vtk-blue/20";

  if (success) {
    return (
      <div className="space-y-3 py-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-vtk-blue/10">
          <CheckCircle2 className="h-8 w-8 text-vtk-blue" />
        </div>
        <h3 className="text-lg font-semibold text-neutral-900">Message sent</h3>
        <p className="text-neutral-600">
          Your message has been sent to {companyName}. They will reach out to
          you via your email address.
        </p>
        <Button
          variant="outline"
          className="border-vtk-blue/30 text-vtk-blue hover:bg-vtk-blue/5"
          onClick={() => {
            setSuccess(false);
            setSubject("");
            setMessage("");
            setFiles([]);
          }}
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contact-name" className="text-neutral-700">
            Your name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="contact-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Your name"
            className={fieldClass}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact-email" className="text-neutral-700">
            Your email <span className="text-red-500">*</span>
          </Label>
          <Input
            id="contact-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            className={fieldClass}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-subject" className="text-neutral-700">
          Subject <span className="text-red-500">*</span>
        </Label>
        <Input
          id="contact-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          placeholder="Application for..."
          className={fieldClass}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-message" className="text-neutral-700">
          Message <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="contact-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={6}
          placeholder="Write your message here..."
          className={fieldClass}
        />
      </div>

      {/* File attachments */}
      <div className="space-y-2">
        <Label className="text-neutral-700">
          Attachments (CV, cover letter, …)
        </Label>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            className="gap-2 border-neutral-200 text-neutral-800 hover:border-vtk-blue/30 hover:bg-vtk-blue/5 hover:text-vtk-blue-dark"
          >
            <Paperclip className="h-4 w-4" />
            Add file
          </Button>
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFiles}
            accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
          />
          <span className="text-xs text-neutral-500">
            PDF, DOC, DOCX, TXT, PNG, JPG (max 10MB each)
          </span>
        </div>
        {files.length > 0 && (
          <div className="mt-2 space-y-1">
            {files.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="flex items-center gap-2 rounded-lg border border-neutral-200/90 bg-vtk-light/60 px-3 py-1.5 text-sm text-neutral-800"
              >
                <Paperclip className="h-3 w-3 flex-shrink-0 text-vtk-blue/70" />
                <span className="truncate">{file.name}</span>
                <span className="flex-shrink-0 text-xs text-neutral-500">
                  ({(file.size / 1024).toFixed(0)} KB)
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="ml-auto hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded p-3">{error}</p>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="gap-2 bg-vtk-blue text-white shadow-sm hover:bg-vtk-blue-dark disabled:opacity-60"
      >
        <Send className="h-4 w-4" />
        {loading ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
