"use client";

// The "Import old CV book" dialog on /admin/cv-book: upload a Litus export,
// check what was read (clicking a row shows that CV's page), untick what
// should stay out, import it as a hidden book (lib/cv-book-import.ts).

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, ExternalLink, FileUp, TriangleAlert, X } from "lucide-react";
import { fetchAcademicYearsAction, fetchCVBooksAction } from "@/app/actions/cv-book";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/admin/DataTable";
import type { ColumnConfig } from "@/components/admin/types";
import type { LitusBook, LitusCV } from "@/lib/litus-cv-book";
import type { AcademicYear } from "@/lib/schema";

type Edit = { firstName: string; lastName: string; email: string };

async function post(body: FormData): Promise<Record<string, unknown>> {
  const res = await fetch("/api/admin/cv-book-import", { method: "POST", body });
  const json = await res.json().catch(() => ({ error: "The server sent no answer." }));
  if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Import failed.");
  return json;
}

export function ImportCVBookDialog({ onImported }: { onImported?: () => void }) {
  const [open, setOpen] = useState(false);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [takenYearIds, setTakenYearIds] = useState<Set<string>>(new Set());
  const [yearId, setYearId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  // The upload as a blob URL, for the browser's own PDF viewer in the preview.
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<LitusBook | null>(null);
  const [edits, setEdits] = useState<Record<number, Edit>>({});
  /** First pages of the CVs that stay out of the book. */
  const [skipped, setSkipped] = useState<Set<number>>(new Set());
  /** The CV whose page is open beside the table. */
  const [viewing, setViewing] = useState<number | null>(null);
  const [onlyIssues, setOnlyIssues] = useState(true);
  const [busy, setBusy] = useState<"reading" | "importing" | null>(null);

  useEffect(() => {
    if (!open) return;
    Promise.all([fetchAcademicYearsAction(), fetchCVBooksAction()]).then(([allYears, books]) => {
      setYears(allYears);
      // One book per year: a year that has one cannot take an import.
      setTakenYearIds(new Set(books.map((b) => String(typeof b.year === "object" ? b.year?.id : b.year))));
    });
  }, [open]);

  const chooseFile = (next: File | null) => {
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFile(next);
    setFileUrl(next ? URL.createObjectURL(next) : null);
    setPreview(null);
    setEdits({});
    setSkipped(new Set());
    setViewing(null);
  };

  const reset = () => {
    chooseFile(null);
    setYearId("");
    setOnlyIssues(true);
  };

  const current = (cv: LitusCV): Edit =>
    edits[cv.page] ?? { firstName: cv.firstName, lastName: cv.lastName, email: cv.email ?? "" };
  const setField = (cv: LitusCV, field: keyof Edit, value: string) =>
    setEdits((prev) => ({ ...prev, [cv.page]: { ...current(cv), [field]: value } }));

  const toggleSkipped = (page: number, include: boolean) =>
    setSkipped((prev) => {
      const next = new Set(prev);
      if (include) next.delete(page);
      else next.add(page);
      return next;
    });

  const withIssues = preview?.cvs.filter((cv) => cv.issues.length > 0) ?? [];
  const included = preview?.cvs.filter((cv) => !skipped.has(cv.page)) ?? [];
  // Left-out CVs are not checked: they are not imported.
  const missingName = included.filter((cv) => !current(cv).firstName.trim() || !current(cv).lastName.trim());
  const shown = onlyIssues && withIssues.length > 0 ? withIssues : preview?.cvs ?? [];
  const viewed = preview?.cvs.find((cv) => cv.page === viewing) ?? null;
  // Previous and next among the rows shown, in page order.
  const shownPages = shown.map((cv) => cv.page).sort((a, b) => a - b);
  const viewedAt = viewing === null ? -1 : shownPages.indexOf(viewing);
  const programmes = useMemo(() => new Set(preview?.cvs.map((cv) => cv.programme)).size, [preview]);
  const yearName = years.find((y) => String(y.id) === yearId)?.name ?? "";

  const read = async () => {
    if (!file) return;
    setBusy("reading");
    try {
      const body = new FormData();
      body.set("mode", "preview");
      body.set("file", file);
      const book = (await post(body)) as unknown as LitusBook;
      setPreview(book);
      setEdits({});
      setSkipped(new Set());
      setViewing(null);
      setOnlyIssues(book.cvs.some((cv) => cv.issues.length > 0));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read the PDF.");
    } finally {
      setBusy(null);
    }
  };

  const runImport = async () => {
    if (!file || !preview || !yearId) return;
    setBusy("importing");
    try {
      const body = new FormData();
      body.set("mode", "import");
      body.set("file", file);
      body.set("yearId", yearId);
      body.set("edits", JSON.stringify(Object.entries(edits).map(([page, e]) => ({ page: Number(page), ...e }))));
      body.set("skip", JSON.stringify([...skipped]));
      await post(body);
      toast.success(`Imported ${included.length} CV${included.length === 1 ? "" : "s"} as the ${yearName} CV book. It stays hidden until you publish it.`);
      setOpen(false);
      reset();
      onImported?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setBusy(null);
    }
  };

  const columns: ColumnConfig<LitusCV>[] = [
    {
      key: "import",
      label: "Import",
      value: (cv) => (skipped.has(cv.page) ? "Left out" : "Imported"),
      render: (cv) => (
        <Checkbox
          checked={!skipped.has(cv.page)}
          onCheckedChange={(on) => toggleSkipped(cv.page, on === true)}
          aria-label={`Import the CV on page ${cv.page}`}
        />
      ),
      className: "w-16",
    },
    {
      key: "page",
      label: "Page",
      value: (cv) => cv.page,
      render: (cv) => (cv.pages.length > 1 ? `${cv.page}–${cv.pages.at(-1)}` : cv.page),
      className: "tabular w-16",
    },
    {
      key: "firstName",
      label: "First name",
      value: (cv) => current(cv).firstName,
      render: (cv) => (
        <Input value={current(cv).firstName} onChange={(e) => setField(cv, "firstName", e.target.value)} className="h-8 min-w-28" />
      ),
    },
    {
      key: "lastName",
      label: "Last name",
      value: (cv) => current(cv).lastName,
      render: (cv) => (
        <Input value={current(cv).lastName} onChange={(e) => setField(cv, "lastName", e.target.value)} className="h-8 min-w-32" />
      ),
    },
    {
      key: "email",
      label: "Email",
      value: (cv) => current(cv).email,
      render: (cv) => (
        <Input
          type="email"
          value={current(cv).email}
          placeholder="None"
          onChange={(e) => setField(cv, "email", e.target.value)}
          className="h-8 min-w-48"
        />
      ),
    },
    { key: "programme", label: "Programme", value: (cv) => cv.programme, filter: true, className: "min-w-64" },
    {
      key: "issues",
      label: "Check",
      value: (cv) => cv.issues.join("; "),
      render: (cv) =>
        cv.issues.length > 0 ? (
          <div className="flex flex-col items-start gap-1">
            {cv.issues.map((issue) => (
              <Badge key={issue} variant="warning">{issue}</Badge>
            ))}
          </div>
        ) : null,
    },
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return; // an import in flight finishes first
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileUp className="mr-2 h-4 w-4" />
          Import old CV book
        </Button>
      </DialogTrigger>
      <DialogContent className={`max-h-[90vh] overflow-y-auto ${viewed ? "sm:max-w-[min(96vw,110rem)]" : "sm:max-w-6xl"}`}>
        <DialogHeader>
          <DialogTitle>Import old CV book</DialogTitle>
          <DialogDescription>
            Upload a CV book exported from Litus. Each CV becomes its own private file and is approved
            straight away; the book stays hidden until you publish it.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="import-year">Academic year *</Label>
            <Select value={yearId} onValueChange={setYearId}>
              <SelectTrigger id="import-year" className="w-full">
                <SelectValue placeholder="Select an academic year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => {
                  const taken = takenYearIds.has(String(year.id));
                  return (
                    <SelectItem key={year.id} value={String(year.id)} disabled={taken}>
                      {year.name}
                      {taken ? " (already has a CV book)" : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Missing an older year? Add it under Academic years first.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="import-file">Litus export (PDF) *</Label>
            <div className="flex gap-2">
              <Input
                id="import-file"
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
              />
              <Button type="button" variant="outline" onClick={read} disabled={!file || busy !== null}>
                {busy === "reading" ? "Reading…" : "Read PDF"}
              </Button>
            </div>
          </div>
        </div>

        {preview && (
          <div className="space-y-3">
            <p className="text-sm">
              Found <strong>{preview.cvs.length} CVs</strong> in {programmes} programmes, on {preview.pageCount} pages.
              {withIssues.length === 0
                ? " Every name matches the book's index."
                : ` ${withIssues.length} need a look.`}
              {skipped.size > 0 && ` ${skipped.size} left out.`}{" "}
              <span className="text-muted-foreground">Click a row to see its page.</span>
            </p>
            {preview.unrecognisedPages.length > 0 && (
              <Warning>
                Skipped page{preview.unrecognisedPages.length > 1 ? "s" : ""} {preview.unrecognisedPages.join(", ")}:
                not a CV, divider, blank page or index. Check them in the PDF; a CV there would not be imported.
              </Warning>
            )}
            {preview.indexOrphans.length > 0 && (
              <Warning>
                The index lists {preview.indexOrphans.length} name{preview.indexOrphans.length > 1 ? "s" : ""} on pages
                where no CV was found:{" "}
                {preview.indexOrphans.map((o) => `${o.name} (p. ${o.page})`).join(", ")}.
              </Warning>
            )}
            {withIssues.length > 0 && (
              <div className="flex items-center gap-2">
                <Switch id="only-issues" checked={onlyIssues} onCheckedChange={setOnlyIssues} />
                <Label htmlFor="only-issues">Only CVs that need a look ({withIssues.length})</Label>
              </div>
            )}
            <div className={viewed ? "grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] xl:grid-cols-[minmax(0,1fr)_minmax(0,36rem)]" : ""}>
              <DataTable
                rows={shown}
                columns={columns}
                getRowId={(cv) => String(cv.page)}
                noun="CV"
                nounPlural="CVs"
                defaultSort={{ key: "page" }}
                onRowClick={(cv) => setViewing(cv.page)}
                isRowSelected={(cv) => cv.page === viewing}
                rowClassName={(cv) => (skipped.has(cv.page) ? "opacity-50" : undefined)}
                containerClassName={viewed ? "roomy:max-h-[60vh]" : "roomy:max-h-[45vh]"}
              />
              {viewed && fileUrl && (
                <div className="flex flex-col gap-2 rounded-lg border p-2 lg:sticky lg:top-0">
                  <div className="flex items-center gap-1">
                    <p className="mr-auto truncate px-1 text-sm font-medium">
                      p. {viewed.page} · {current(viewed).firstName} {current(viewed).lastName}
                    </p>
                    <label className="mr-2 flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={!skipped.has(viewed.page)}
                        onCheckedChange={(on) => toggleSkipped(viewed.page, on === true)}
                      />
                      Import
                    </label>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={viewedAt <= 0}
                      onClick={() => setViewing(shownPages[viewedAt - 1])}
                      aria-label="Previous CV"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={viewedAt < 0 || viewedAt >= shownPages.length - 1}
                      onClick={() => setViewing(shownPages[viewedAt + 1])}
                      aria-label="Next CV"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <a href={`${fileUrl}#page=${viewed.page}`} target="_blank" rel="noreferrer" aria-label="Open in a new tab">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewing(null)} aria-label="Close the preview">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {/* The browser's own viewer, on the whole upload; remounted per CV so it jumps to the page. */}
                  <iframe
                    key={viewed.page}
                    src={`${fileUrl}#page=${viewed.page}`}
                    title={`CV on page ${viewed.page}`}
                    className="h-[60vh] w-full rounded border bg-muted"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="items-center gap-2">
          {preview && missingName.length > 0 && (
            <p className="text-sm text-destructive sm:mr-auto">
              {missingName.length} CV{missingName.length > 1 ? "s need" : " needs"} a first and last name.
            </p>
          )}
          <Button
            onClick={runImport}
            disabled={!preview || !yearId || included.length === 0 || missingName.length > 0 || busy !== null}
          >
            {busy === "importing" ? "Importing…" : preview ? `Import ${included.length} CV${included.length === 1 ? "" : "s"}` : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{children}</p>
    </div>
  );
}
