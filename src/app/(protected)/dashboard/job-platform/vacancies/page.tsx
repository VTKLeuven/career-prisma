"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "@/app/actions/vacancies";
import type { Vacancy, VacancyType, VacancySector } from "@/lib/schema";

const statusColors: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-800",
  published: "bg-green-100 text-green-800",
  archived: "bg-neutral-100 text-neutral-600",
};

export default function DashboardVacanciesPage() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);

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

  const getTypeName = (v: Vacancy) =>
    typeof v.type === "object" ? (v.type as VacancyType).name : "";
  const getSectorName = (v: Vacancy) =>
    typeof v.sector === "object" ? (v.sector as VacancySector).name : "";

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
                <TableHead>Sector</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vacancies.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.title}</TableCell>
                  <TableCell>{getTypeName(v)}</TableCell>
                  <TableCell>{getSectorName(v)}</TableCell>
                  <TableCell>{v.location}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={statusColors[v.status] ?? ""}
                    >
                      {v.status}
                    </Badge>
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
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
