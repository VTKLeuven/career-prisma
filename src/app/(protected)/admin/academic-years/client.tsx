"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import {
  createAcademicYearAction,
  updateAcademicYearAction,
} from "@/app/actions/annual-catalog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AcademicYear } from "@/lib/schema";

const inputDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

const displayDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-GB");
};

export default function AcademicYearsClient({ initialYears }: { initialYears: AcademicYear[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [start, setStart] = React.useState("");
  const [end, setEnd] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const openCreate = () => {
    const latestEnd = initialYears
      .map((year) => new Date(year.end_of_year))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => b.getTime() - a.getTime())[0];
    if (latestEnd) {
      const nextStart = new Date(latestEnd);
      nextStart.setUTCDate(nextStart.getUTCDate() + 1);
      const nextEnd = new Date(nextStart);
      nextEnd.setUTCFullYear(nextEnd.getUTCFullYear() + 1);
      nextEnd.setUTCDate(nextEnd.getUTCDate() - 1);
      setStart(nextStart.toISOString().slice(0, 10));
      setEnd(nextEnd.toISOString().slice(0, 10));
      setName(`${nextStart.getUTCFullYear()}-${nextEnd.getUTCFullYear()}`);
    } else {
      setName(""); setStart(""); setEnd("");
    }
    setEditingId(null);
    setError(null);
    setOpen(true);
  };

  const openEdit = (year: AcademicYear) => {
    setEditingId(String(year.id));
    setName(year.name);
    setStart(inputDate(year.start_of_year));
    setEnd(inputDate(year.end_of_year));
    setError(null);
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Add academic year</Button>
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Starts</TableHead><TableHead>Ends</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {initialYears.map((year) => (
              <TableRow key={year.id}>
                <TableCell className="font-medium">{year.name}</TableCell>
                <TableCell>{displayDate(year.start_of_year)}</TableCell>
                <TableCell>{displayDate(year.end_of_year)}</TableCell>
                <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => openEdit(year)} aria-label={`Edit ${year.name}`}><Pencil className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Edit academic year" : "Add academic year"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="2026-2027" /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Starts</Label><Input type="date" value={start} onChange={(event) => setStart(event.target.value)} /></div>
              <div className="space-y-2"><Label>Ends</Label><Input type="date" value={end} onChange={(event) => setEnd(event.target.value)} /></div>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!name || !start || !end || saving} onClick={async () => {
              setSaving(true); setError(null);
              const result = editingId
                ? await updateAcademicYearAction({ id: editingId, name, startOfYear: start, endOfYear: end })
                : await createAcademicYearAction({ name, startOfYear: start, endOfYear: end });
              setSaving(false);
              if (!result.success) return setError(result.error ?? "Could not save academic year");
              setOpen(false);
              router.refresh();
            }}>{saving ? "Saving…" : editingId ? "Save changes" : "Add year"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
