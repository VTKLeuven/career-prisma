"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Paperclip, X, Send, CheckCircle2 } from "lucide-react";

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

      const res = await fetch("/api/vacancies/contact", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send message");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-8 space-y-3">
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
        <h3 className="text-lg font-semibold">Message Sent!</h3>
        <p className="text-muted-foreground">
          Your message has been sent to {companyName}. They will reach out to
          you via your email address.
        </p>
        <Button
          variant="outline"
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contact-name">
            Your Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="contact-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Your name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact-email">
            Your Email <span className="text-red-500">*</span>
          </Label>
          <Input
            id="contact-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-subject">
          Subject <span className="text-red-500">*</span>
        </Label>
        <Input
          id="contact-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          placeholder="Application for..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-message">
          Message <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="contact-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={6}
          placeholder="Write your message here..."
        />
      </div>

      {/* File attachments */}
      <div className="space-y-2">
        <Label>Attachments (CV, cover letter, ...)</Label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            className="gap-2"
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
          <span className="text-xs text-muted-foreground">
            PDF, DOC, DOCX, TXT, PNG, JPG (max 10MB each)
          </span>
        </div>
        {files.length > 0 && (
          <div className="space-y-1 mt-2">
            {files.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="flex items-center gap-2 text-sm bg-muted rounded px-3 py-1.5"
              >
                <Paperclip className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{file.name}</span>
                <span className="text-muted-foreground text-xs flex-shrink-0">
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

      <Button type="submit" disabled={loading} className="gap-2">
        <Send className="h-4 w-4" />
        {loading ? "Sending..." : "Send Message"}
      </Button>
    </form>
  );
}
