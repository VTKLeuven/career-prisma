"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Loader2, RotateCcw, Search, Upload, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/admin/DataTable";
import type { ColumnConfig, SelectOption } from "@/components/admin/types";
import {
  applyRepAccountImportAction,
  previewRepAccountImportAction,
} from "@/app/actions/admin-users";
import type { ImportChoices, RepImportPlan, RepImportRow } from "@/lib/rep-account-import";
import { cn } from "@/lib/utils";

const RESULT_FILTER = [
  { value: "create", label: "New" },
  { value: "update", label: "New password" },
  { value: "error", label: "With a problem" },
  { value: "skip", label: "Skipped" },
];

type Choices = Required<ImportChoices>;
const NO_CHOICES: Choices = { companies: {}, skippedLines: [] };

// A server action that cannot be reached throws instead of returning a result.
// The usual cause is a deploy while this page was open: every build renames
// the actions, so the old page's calls are refused until it is reloaded.
const UNREACHABLE =
  "Could not reach the server. If the site was updated while this page was open, reload the page and try again.";

const TEMPLATE =
  "company,email,password,first_name,last_name\n" +
  "Example NV,scanner1.example@vtk.be,choose-a-password,Scanner,1\n";

/**
 * "Import accounts" on /admin/users: a CSV of company, email and password
 * becomes active representative accounts, with nothing mailed. The file is
 * checked first and shown line by line. A company name that matches no
 * company (or several) gets a picker; the choice covers every line with that
 * name and is checked again on the server. Any line can be skipped, which
 * leaves it out of the import. The import only runs once every line that is
 * not skipped is fine, and then all at once.
 */
export function ImportAccountsDialog({ companies }: { companies: SelectOption[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [choices, setChoices] = React.useState<Choices>(NO_CHOICES);
  const [plan, setPlan] = React.useState<RepImportPlan | null>(null);
  const [checking, setChecking] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const templateHref = React.useMemo(
    () => `data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE)}`,
    []
  );

  const reset = () => {
    setFile(null);
    setChoices(NO_CHOICES);
    setPlan(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const formData = (f: File, c: Choices) => {
    const fd = new FormData();
    fd.append("file", f);
    fd.append("companyChoices", JSON.stringify(c.companies));
    fd.append("skippedLines", JSON.stringify(c.skippedLines));
    return fd;
  };

  // The current plan stays on screen while a re-check runs, so choosing a
  // company does not make the table jump.
  const check = async (f: File, c: Choices) => {
    setError(null);
    setChecking(true);
    try {
      const result = await previewRepAccountImportAction(formData(f, c));
      if (!result?.success || !result.data) setError(result?.error ?? "Could not read the file");
      else setPlan(result.data);
    } catch (err) {
      console.error("[ImportAccountsDialog] check failed", err);
      setError(UNREACHABLE);
    } finally {
      setChecking(false);
    }
  };

  const pickFile = (f: File) => {
    setFile(f);
    setChoices(NO_CHOICES);
    setPlan(null);
    void check(f, NO_CHOICES);
  };

  // Every decision is checked again on the server with the file.
  const decide = React.useCallback(
    (next: Choices) => {
      if (!file) return;
      setChoices(next);
      void check(file, next);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [file]
  );

  const chooseCompany = React.useCallback(
    (key: string, companyId: string) =>
      decide({ ...choices, companies: { ...choices.companies, [key]: companyId } }),
    [decide, choices]
  );

  const setSkipped = (lines: number[], skip: boolean) => {
    const current = new Set(choices.skippedLines);
    for (const line of lines) {
      if (skip) current.add(line);
      else current.delete(line);
    }
    decide({ ...choices, skippedLines: [...current].sort((a, b) => a - b) });
  };

  const rows = React.useMemo(() => plan?.rows ?? [], [plan]);
  const created = rows.filter((r) => r.action === "create").length;
  const updated = rows.filter((r) => r.action === "update").length;
  const problemLines = rows.filter((r) => r.action === "error").map((r) => r.line);
  const problems = problemLines.length;
  const skippedCount = rows.filter((r) => r.action === "skip").length;
  const companyProblems = rows.filter((r) => r.companyProblem).length;
  const canImport = Boolean(file && plan && !plan.fileError && problems === 0 && created + updated > 0);

  // How many lines share each company name, so the picker can say its choice covers them all.
  const linesPerName = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) counts.set(r.companyKey, (counts.get(r.companyKey) ?? 0) + 1);
    return counts;
  }, [rows]);

  const columns = React.useMemo<ColumnConfig<RepImportRow>[]>(
    () => [
      { key: "line", label: "Line", align: "right", className: "w-12 tabular-nums text-muted-foreground" },
      { key: "email", label: "Email" },
      {
        key: "company",
        label: "Company",
        wrap: true,
        value: (r) => r.companyName ?? r.company,
        render: (r) =>
          r.companyProblem || r.companyChosen ? (
            <div className="flex min-w-48 flex-col items-start gap-1.5 py-0.5">
              {r.companyChosen ? <span className="font-medium">{r.companyName}</span> : null}
              <span className="text-xs text-muted-foreground">In the file: “{r.company}”</span>
              <CompanyPicker
                typed={r.company}
                companies={companies}
                selectedId={r.companyChosen ? r.companyId : undefined}
                label={r.companyChosen ? "Change" : "Choose company"}
                lines={linesPerName.get(r.companyKey) ?? 1}
                disabled={checking || importing}
                onPick={(id) => chooseCompany(r.companyKey, id)}
              />
            </div>
          ) : (
            r.companyName ?? r.company
          ),
      },
      {
        key: "action",
        label: "Result",
        wrap: true,
        value: (r) => r.action,
        filter: { options: RESULT_FILTER },
        render: (r) =>
          r.action === "create" ? (
            <Badge variant="success">New account</Badge>
          ) : r.action === "skip" ? (
            <Badge variant="muted">Skipped</Badge>
          ) : r.action === "update" ? (
            <span className="flex flex-wrap items-center gap-1.5">
              <Badge variant="info">New password</Badge>
              {r.movedFrom ? (
                <Badge variant="warning" className="whitespace-normal">
                  Moves from {r.movedFrom}
                </Badge>
              ) : null}
            </span>
          ) : (
            <Badge variant="destructive" className="whitespace-normal">
              {r.error}
            </Badge>
          ),
      },
    ],
    [companies, linesPerName, checking, importing, chooseCompany]
  );

  const runImport = async () => {
    if (!file) return;
    setImporting(true);
    setError(null);
    try {
      const result = await applyRepAccountImportAction(formData(file, choices));
      if (!result?.success) {
        setError(result?.error ?? "The import failed; nothing was changed");
        return;
      }
      toast.success(
        `Imported ${created + updated} accounts: ${created} created, ${updated} with a new password${skippedCount ? `, ${skippedCount} skipped` : ""}.`
      );
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      console.error("[ImportAccountsDialog] import failed", err);
      setError(UNREACHABLE);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4" /> Import accounts
      </Button>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import representative accounts</DialogTitle>
          <DialogDescription>
            Creates company representative accounts with the password you choose, or gives existing ones a
            new password. Nothing is e-mailed, so the addresses do not have to be real inboxes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            A CSV file (comma or semicolon separated, as Excel saves it) whose first line names the columns{" "}
            <code className="rounded bg-muted px-1">company</code>,{" "}
            <code className="rounded bg-muted px-1">email</code> and{" "}
            <code className="rounded bg-muted px-1">password</code>, optionally{" "}
            <code className="rounded bg-muted px-1">first_name</code> and{" "}
            <code className="rounded bg-muted px-1">last_name</code>. Companies must already exist; a name that
            does not match one exactly (capitals aside) can be matched by hand below. Passwords need at least 8
            characters.
          </p>
          <Button variant="outline" size="sm" asChild>
            <a href={templateHref} download="representative-accounts.csv">
              <Download className="h-4 w-4" /> Download a template
            </a>
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="import-accounts-file">File</Label>
          <Input
            ref={inputRef}
            id="import-accounts-file"
            type="file"
            accept=".csv,text/csv"
            disabled={checking || importing}
            onChange={(e) => {
              const picked = e.target.files?.[0];
              if (picked) pickFile(picked);
            }}
          />
        </div>

        {checking ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking the file…
          </p>
        ) : null}

        {plan?.fileError ? (
          <p className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-sm text-[#b91c1c]">
            {plan.fileError}
          </p>
        ) : null}

        {plan && !plan.fileError ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">{created} new</Badge>
              <Badge variant="info">{updated} new password</Badge>
              {problems > 0 ? <Badge variant="destructive">{problems} with a problem</Badge> : null}
              {skippedCount > 0 ? <Badge variant="muted">{skippedCount} skipped</Badge> : null}
            </div>
            {problems > 0 ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Nothing is imported while a line has a problem.
                  {companyProblems > 0 ? " Choose the company for names that did not match," : ""} Skip a line
                  to leave it out, or fix the file and choose it again.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 self-start sm:self-auto"
                  disabled={checking || importing}
                  onClick={() => setSkipped(problemLines, true)}
                >
                  Skip all {problems} with a problem
                </Button>
              </div>
            ) : null}
            <DataTable
              rows={rows}
              columns={columns}
              getRowId={(r) => String(r.line)}
              noun="line"
              search={false}
              defaultSort={{ key: "line" }}
              rowClassName={(r) => (r.action === "skip" ? "text-muted-foreground" : undefined)}
              rowActionsAlwaysVisible
              rowActions={(r) =>
                r.action === "skip" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    disabled={checking || importing}
                    onClick={() => setSkipped([r.line], false)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Include
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    disabled={checking || importing}
                    onClick={() => setSkipped([r.line], true)}
                  >
                    <X className="h-3.5 w-3.5" /> Skip
                  </Button>
                )
              }
              // No height cap of its own: the dialog scrolls as a whole, so the
              // table is not a scroll box inside a scroll box.
              containerClassName=""
            />
          </div>
        ) : null}

        {error ? (
          <p className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-sm text-[#b91c1c]">{error}</p>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={runImport} disabled={!canImport || importing || checking}>
            {importing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Importing…
              </>
            ) : canImport ? (
              `Import ${created + updated} account${created + updated === 1 ? "" : "s"}`
            ) : (
              "Import"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ company picker ------------------------------ */

// Legal-form suffixes say nothing about which company is meant ("Acme" vs "Acme NV").
const LEGAL_FORMS = /\b(nv|bv|bvba|cvba|sa|srl|sprl|vzw|asbl|ltd|gmbh|ag|inc|llc|plc)\b/g;

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(LEGAL_FORMS, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function bigrams(s: string): Map<string, number> {
  const compact = s.replace(/ /g, "");
  const counts = new Map<string, number>();
  for (let i = 0; i < compact.length - 1; i++) {
    const pair = compact.slice(i, i + 2);
    counts.set(pair, (counts.get(pair) ?? 0) + 1);
  }
  return counts;
}

/** 0..1, how alike two normalized names are: containment first, else shared letter pairs (Dice). */
function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.9;
  const x = bigrams(a);
  const y = bigrams(b);
  let shared = 0;
  let total = 0;
  for (const n of x.values()) total += n;
  for (const n of y.values()) total += n;
  for (const [pair, n] of x) shared += Math.min(n, y.get(pair) ?? 0);
  return total === 0 ? 0 : (2 * shared) / total;
}

/**
 * Picks a company for a name from the file. Opens inline under the cell
 * rather than in a popover (the UI kit has none): a search box and a short
 * list, the names closest to the one in the file first.
 */
function CompanyPicker({
  typed,
  companies,
  selectedId,
  label,
  lines,
  disabled,
  onPick,
}: {
  typed: string;
  companies: SelectOption[];
  selectedId?: string;
  label: string;
  lines: number;
  disabled: boolean;
  onPick: (companyId: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const normalized = React.useMemo(
    () => companies.map((c) => ({ ...c, normalized: normalizeName(c.label) })),
    [companies]
  );

  const ranked = React.useMemo(() => {
    const q = normalizeName(query);
    const target = q || normalizeName(typed);
    return normalized
      .filter((c) => !q || c.normalized.includes(q) || c.label.toLowerCase().includes(query.trim().toLowerCase()))
      .map((c) => ({ ...c, score: similarity(target, c.normalized) }))
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
      .slice(0, 30);
  }, [normalized, query, typed]);

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>
    );
  }

  return (
    <div
      className="w-full min-w-56 rounded-lg border bg-background p-2 shadow-sm"
      onKeyDown={(e) => {
        // Escape closes the picker, not the whole dialog.
        if (e.key === "Escape") {
          e.stopPropagation();
          setOpen(false);
        }
      }}
    >
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search companies…"
          className="h-8 pl-8 text-sm"
        />
      </div>
      {!query ? <p className="px-1 pt-2 text-xs text-muted-foreground">Closest to “{typed}” first</p> : null}
      <ul className="scrollbar-thin mt-1 max-h-48 overflow-y-auto">
        {ranked.length === 0 ? (
          <li className="px-2 py-1.5 text-sm text-muted-foreground">No company matches</li>
        ) : (
          ranked.map((c) => (
            <li key={c.value}>
              <button
                type="button"
                disabled={disabled}
                className={cn(
                  "w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-hover",
                  c.value === selectedId && "bg-surface-selected font-medium"
                )}
                onClick={() => {
                  setOpen(false);
                  setQuery("");
                  onPick(c.value);
                }}
              >
                {c.label}
              </button>
            </li>
          ))
        )}
      </ul>
      <div className="flex items-center justify-between gap-2 border-t pt-2 text-xs text-muted-foreground">
        <span>{lines > 1 ? `Applies to all ${lines} lines with this name` : " "}</span>
        <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
