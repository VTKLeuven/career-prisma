"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  fetchMyVacanciesAction,
  deleteVacancyAction,
  updateVacancyStatusAction,
} from "@/app/actions/vacancies";
import type { Vacancy, VacancyType } from "@/lib/schema";
import {
  getVacancySectorsResolved,
  vacancySectorDisplayName,
} from "@/lib/vacancy-sectors";
import { cn } from "@/lib/utils";

const statusTriggerClass: Record<Vacancy["status"], string> = {
  draft: "border-yellow-200 bg-yellow-50 text-yellow-900",
  published: "border-green-200 bg-green-50 text-green-900",
  archived: "border-neutral-200 bg-neutral-50 text-neutral-700",
};

const statusLabels: Record<Vacancy["status"], string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

export default function DashboardVacanciesPage() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchMyVacanciesAction();
      setVacancies(data ?? []);
    } catch (err) {
      console.error("Failed to load vacancies:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteVacancyAction(id);
      setVacancies((prev) => prev.filter((v) => v.id !== id));
    } catch (err) {
      console.error("Failed to delete vacancy:", err);
    }
  };

  const handleStatusChange = async (
    vacancyId: string,
    next: Vacancy["status"]
  ) => {
    const current = vacancies.find((x) => x.id === vacancyId)?.status;
    if (current === next) return;
    setStatusUpdatingId(vacancyId);
    try {
      await updateVacancyStatusAction(vacancyId, next);
      setVacancies((prev) =>
        prev.map((v) => (v.id === vacancyId ? { ...v, status: next } : v))
      );
    } catch (err) {
      console.error("Failed to update vacancy status:", err);
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const getTypeName = (v: Vacancy) =>
    typeof v.type === "object" ? (v.type as VacancyType).name : "";
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Vacancies</h2>
          <p className="text-muted-foreground">
            Manage your job postings and find the right candidates.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/job-platform/vacancies/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Vacancy
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-md bg-muted animate-pulse" />
          ))}
        </div>
      ) : vacancies.length === 0 ? (
        <div className="text-center py-16 border rounded-lg">
          <p className="text-muted-foreground mb-4">
            You haven&apos;t posted any vacancies yet.
          </p>
          <Button asChild>
            <Link href="/dashboard/job-platform/vacancies/new">
              <Plus className="mr-2 h-4 w-4" />
              Create your first vacancy
            </Link>
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Sectors</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vacancies.map((v) => {
                const sectorList = getVacancySectorsResolved(v);
                return (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.title}</TableCell>
                  <TableCell>{getTypeName(v)}</TableCell>
                  <TableCell className="min-w-[140px] max-w-[320px]">
                    <div className="flex flex-wrap gap-1">
                      {sectorList.length === 0 ? (
                        <span className="text-muted-foreground text-sm">—</span>
                      ) : (
                        sectorList.map((s) => (
                          <Badge
                            key={s.id}
                            variant="outline"
                            className="border-neutral-200 font-normal text-neutral-700"
                          >
                            {vacancySectorDisplayName(s)}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{v.location}</TableCell>
                  <TableCell>
                    <Select
                      value={v.status}
                      disabled={statusUpdatingId === v.id}
                      onValueChange={(value) =>
                        handleStatusChange(v.id, value as Vacancy["status"])
                      }
                    >
                      <SelectTrigger
                        className={cn(
                          "h-8 w-[148px] text-xs font-medium",
                          statusTriggerClass[v.status] ?? ""
                        )}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(statusLabels) as Vacancy["status"][]).map(
                          (s) => (
                            <SelectItem key={s} value={s}>
                              {statusLabels[s]}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {new Date(v.date_created).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" asChild>
                        <Link
                          href={`/dashboard/job-platform/vacancies/${v.id}/edit`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete vacancy?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete &quot;{v.title}
                              &quot;. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(v.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
