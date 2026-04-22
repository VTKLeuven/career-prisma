"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type {
  Vacancy,
  VacancyType,
  VacancySector,
  VacancySectionConfig,
  Master,
} from "@/lib/schema";
import { getVacancySectorsResolved } from "@/lib/vacancy-sectors";

const EditorContent = dynamic(
  () => import("@tiptap/react").then((mod) => mod.EditorContent),
  { ssr: false }
);

interface VacancyFormProps {
  vacancy?: Vacancy | null;
  types: VacancyType[];
  sectors: VacancySector[];
  sectionConfigs: VacancySectionConfig[];
  masters: Master[];
  onSubmit: (data: VacancyFormData) => Promise<void>;
  submitLabel?: string;
}

export interface VacancyFormData {
  title: string;
  type: string;
  /** One or more vacancy_sectors ids. */
  sectors: string[];
  location: string;
  contact_email: string;
  contact_name: string;
  contact_phone: string;
  /** Keys = vacancy_section_config row ids (Directus PK). */
  sections: Record<string, string>;
  masters: string[];
  status: "draft" | "published" | "archived";
}

function sectionHtmlFromVacancy(
  vacancySections: Record<string, string> | undefined | null,
  cfg: VacancySectionConfig
): string {
  const byId = vacancySections?.[cfg.id];
  if (byId !== undefined) return byId;
  if (cfg.key) return vacancySections?.[cfg.key] ?? "";
  return "";
}

/**
 * TipTap v3 + Next: never call `useEditor` with `editable: false` then flip to true in the
 * same component — `setOptions` keeps the stale `editor.isEditable` and the field stays read-only.
 * Mount the editor only after client hydration with `editable: true`.
 */
function RichTextEditor({
  label,
  required,
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (html: string) => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="space-y-2">
        <Label>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <div className="h-32 rounded-md border bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <RichTextEditorInner
      label={label}
      required={required}
      value={value}
      onChange={onChange}
    />
  );
}

function RichTextEditorInner({
  label,
  required,
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    immediatelyRender: false,
    editable: true,
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "");
    }
  }, [editor, value]);

  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {editor && (
        <div className="space-y-1">
          <div className="flex flex-wrap gap-1 border rounded-t-md p-1 bg-muted/50">
            <Button
              type="button"
              variant={editor.isActive("bold") ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              B
            </Button>
            <Button
              type="button"
              variant={editor.isActive("italic") ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              I
            </Button>
            <Button
              type="button"
              variant={editor.isActive("heading", { level: 2 }) ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              H2
            </Button>
            <Button
              type="button"
              variant={editor.isActive("heading", { level: 3 }) ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            >
              H3
            </Button>
            <Button
              type="button"
              variant={editor.isActive("bulletList") ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              List
            </Button>
            <Button
              type="button"
              variant={editor.isActive("orderedList") ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              1. List
            </Button>
          </div>
          <div className="border border-t-0 rounded-b-md p-3 min-h-[200px] prose prose-sm max-w-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[180px]">
            <EditorContent editor={editor} />
          </div>
        </div>
      )}
    </div>
  );
}

export function VacancyForm({
  vacancy,
  types,
  sectors,
  sectionConfigs,
  masters,
  onSubmit,
  submitLabel = "Save",
}: VacancyFormProps) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(vacancy?.title ?? "");
  const [typeId, setTypeId] = useState(
    typeof vacancy?.type === "object" ? vacancy.type.id : (vacancy?.type ?? "")
  );
  const [selectedSectors, setSelectedSectors] = useState<string[]>(() => {
    const resolved = vacancy ? getVacancySectorsResolved(vacancy) : [];
    if (resolved.length > 0) return resolved.map((s) => s.id);
    const legacy =
      typeof vacancy?.sector === "object"
        ? vacancy.sector.id
        : (vacancy?.sector ?? "");
    return legacy ? [legacy] : [];
  });
  const [location, setLocation] = useState(vacancy?.location ?? "");
  const [contactEmail, setContactEmail] = useState(
    vacancy?.contact_email ?? ""
  );
  const [contactName, setContactName] = useState(
    vacancy?.contact_name ?? ""
  );
  const [contactPhone, setContactPhone] = useState(
    vacancy?.contact_phone ?? ""
  );
  const [status, setStatus] = useState<"draft" | "published" | "archived">(
    vacancy?.status ?? "draft"
  );

  const existingMasterIds =
    vacancy?.masters?.map((m) =>
      typeof m.master_id === "object" ? m.master_id.id : m.master_id
    ) ?? [];
  const [selectedMasters, setSelectedMasters] =
    useState<string[]>(existingMasterIds);

  const [sections, setSections] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const cfg of sectionConfigs) {
      initial[cfg.id] = sectionHtmlFromVacancy(vacancy?.sections, cfg);
    }
    return initial;
  });

  const handleSectionChange = useCallback((key: string, html: string) => {
    setSections((prev) => ({ ...prev, [key]: html }));
  }, []);

  const toggleMaster = (masterId: string) => {
    setSelectedMasters((prev) =>
      prev.includes(masterId)
        ? prev.filter((id) => id !== masterId)
        : [...prev, masterId]
    );
  };

  const toggleSector = (sectorId: string) => {
    setSelectedSectors((prev) =>
      prev.includes(sectorId)
        ? prev.filter((id) => id !== sectorId)
        : [...prev, sectorId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSectors.length === 0) return;
    setLoading(true);
    try {
      await onSubmit({
        title,
        type: typeId,
        sectors: selectedSectors,
        location,
        contact_email: contactEmail,
        contact_name: contactName,
        contact_phone: contactPhone,
        sections,
        masters: selectedMasters,
        status,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
      {/* Basic info */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Basic Information</h3>
        <div className="space-y-2">
          <Label htmlFor="title">
            Title <span className="text-red-500">*</span>
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g. Software Engineering Intern"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">
            Type <span className="text-red-500">*</span>
          </Label>
          <Select value={typeId} onValueChange={setTypeId} required>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {types.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>
            Sectors <span className="text-red-500">*</span>
          </Label>
          <p className="text-xs text-muted-foreground">
            Select all sectors that apply (at least one).
          </p>
          <div className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto rounded-md border p-3 sm:grid-cols-2">
            {sectors.map((s) => (
              <label
                key={s.id}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <Checkbox
                  checked={selectedSectors.includes(s.id)}
                  onCheckedChange={() => toggleSector(s.id)}
                />
                {s.name}
              </label>
            ))}
          </div>
          {selectedSectors.length === 0 && (
            <p className="text-xs text-amber-600">
              Choose at least one sector to save this vacancy.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">
            Location <span className="text-red-500">*</span>
          </Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
            placeholder="e.g. Brussels, Belgium"
          />
        </div>

        <div className="space-y-2">
          <Label>Target Masters</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
            {masters.map((m) => (
              <label
                key={m.id}
                className="flex items-center gap-2 cursor-pointer text-sm"
              >
                <Checkbox
                  checked={selectedMasters.includes(m.id)}
                  onCheckedChange={() => toggleMaster(m.id)}
                />
                {m.name}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={status}
            onValueChange={(v) =>
              setStatus(v as "draft" | "published" | "archived")
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Contact info */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Contact Information</h3>
        <p className="text-sm text-muted-foreground">
          This is the contact info students will see and use to reach you about
          this vacancy.
        </p>
        <div className="space-y-2">
          <Label htmlFor="contact_email">
            Contact Email <span className="text-red-500">*</span>
          </Label>
          <Input
            id="contact_email"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            required
            placeholder="hr@company.com"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contact_name">Contact Name</Label>
            <Input
              id="contact_name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Jane Doe"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_phone">Contact Phone</Label>
            <Input
              id="contact_phone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+32 ..."
            />
          </div>
        </div>
      </div>

      {/* Dynamic rich text sections */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Vacancy Details</h3>
        {sectionConfigs.map((cfg) => (
          <RichTextEditor
            key={cfg.id}
            label={cfg.label}
            required={cfg.required}
            value={sections[cfg.id] ?? ""}
            onChange={(html) => handleSectionChange(cfg.id, html)}
          />
        ))}
      </div>

      {/* Submit */}
      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={loading || selectedSectors.length === 0}
        >
          {loading ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
