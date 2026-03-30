"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VacancyCard } from "@/components/vacancies/VacancyCard";
import {
  fetchPublicVacanciesAction,
  fetchVacancyTypesAction,
  fetchVacancySectorsAction,
} from "@/app/actions/vacancies";
import { fetchMastersAction } from "@/app/actions/features";
import type {
  Vacancy,
  VacancyType,
  VacancySector,
  Master,
} from "@/lib/schema";
import { Search, X, SlidersHorizontal, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

type SortOption = "newest" | "oldest" | "az" | "za";

export default function VacanciesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [types, setTypes] = useState<VacancyType[]>([]);
  const [sectors, setSectors] = useState<VacancySector[]>([]);
  const [masters, setMasters] = useState<Master[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state from URL
  const [filterType, setFilterType] = useState(
    searchParams.get("type") ?? ""
  );
  const [filterSector, setFilterSector] = useState(
    searchParams.get("sector") ?? ""
  );
  const [filterMaster, setFilterMaster] = useState(
    searchParams.get("master") ?? ""
  );
  const [filterLocation, setFilterLocation] = useState(
    searchParams.get("location") ?? ""
  );
  const [sortBy, setSortBy] = useState<SortOption>(
    (searchParams.get("sort") as SortOption) ?? "newest"
  );
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchPublicVacanciesAction(),
      fetchVacancyTypesAction(),
      fetchVacancySectorsAction(),
      fetchMastersAction(),
    ]).then(([v, t, s, m]) => {
      setVacancies(v ?? []);
      setTypes(t ?? []);
      setSectors(s ?? []);
      setMasters(m ?? []);
      setLoading(false);
    });
  }, []);

  // Update URL when filters change
  const updateUrl = useCallback(
    (params: Record<string, string>) => {
      const sp = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v) sp.set(k, v);
      }
      const qs = sp.toString();
      router.replace(`/vacancies${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router]
  );

  useEffect(() => {
    updateUrl({
      type: filterType,
      sector: filterSector,
      master: filterMaster,
      location: filterLocation,
      sort: sortBy !== "newest" ? sortBy : "",
    });
  }, [filterType, filterSector, filterMaster, filterLocation, sortBy, updateUrl]);

  const filtered = useMemo(() => {
    let result = [...vacancies];

    if (filterType) {
      result = result.filter((v) => {
        const tid = typeof v.type === "object" ? v.type.id : v.type;
        return tid === filterType;
      });
    }
    if (filterSector) {
      result = result.filter((v) => {
        const sid = typeof v.sector === "object" ? v.sector.id : v.sector;
        return sid === filterSector;
      });
    }
    if (filterMaster) {
      result = result.filter((v) =>
        v.masters?.some((m) => {
          const mid = typeof m.master_id === "object" ? m.master_id.id : m.master_id;
          return mid === filterMaster;
        })
      );
    }
    if (filterLocation) {
      const loc = filterLocation.toLowerCase();
      result = result.filter((v) =>
        v.location?.toLowerCase().includes(loc)
      );
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return (
            new Date(a.date_created).getTime() -
            new Date(b.date_created).getTime()
          );
        case "az":
          return a.title.localeCompare(b.title);
        case "za":
          return b.title.localeCompare(a.title);
        case "newest":
        default:
          return (
            new Date(b.date_created).getTime() -
            new Date(a.date_created).getTime()
          );
      }
    });

    return result;
  }, [vacancies, filterType, filterSector, filterMaster, filterLocation, sortBy]);

  const hasFilters = filterType || filterSector || filterMaster || filterLocation;

  const clearFilters = () => {
    setFilterType("");
    setFilterSector("");
    setFilterMaster("");
    setFilterLocation("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-vtk-blue/5">
      <div className="container mx-auto px-4 py-16 sm:py-24">
        {/* Header — same card pattern as Contact / Terms */}
        <div className="max-w-3xl mx-auto rounded-2xl border border-neutral-200/80 bg-white p-8 shadow-sm text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-vtk-blue/10 p-4 ring-4 ring-vtk-blue/5">
              <Building2 className="h-10 w-10 text-vtk-blue" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-2">
            Vacancies
          </h1>
          <p className="text-lg text-neutral-700">
            Browse job opportunities, internships and more from our partner
            companies.
          </p>
        </div>

        {/* Search & filters — VTK shell */}
        <div className="max-w-4xl mx-auto rounded-2xl border border-neutral-200/80 bg-white shadow-sm p-5 sm:p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-vtk-blue/50" />
              <Input
                className="pl-9 border-neutral-200 focus-visible:border-vtk-blue/40 focus-visible:ring-vtk-blue/20"
                placeholder="Search by location..."
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
              />
            </div>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-full sm:w-44 border-neutral-200 focus:ring-vtk-blue/25">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="az">A - Z</SelectItem>
                <SelectItem value="za">Z - A</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={showFilters ? "default" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "gap-2 shrink-0",
                showFilters
                  ? "bg-vtk-blue hover:bg-vtk-blue-dark text-white shadow-sm"
                  : "border-vtk-blue/25 text-vtk-blue hover:bg-vtk-blue/5 hover:text-vtk-blue-dark"
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {hasFilters && (
                <span
                  className={cn(
                    "ml-1 rounded-full w-5 h-5 text-xs flex items-center justify-center font-semibold",
                    showFilters
                      ? "bg-white/20 text-white"
                      : "bg-vtk-yellow text-vtk-blue-dark"
                  )}
                >
                  !
                </span>
              )}
            </Button>
          </div>

          {showFilters && (
            <div className="mt-6 pt-6 border-t border-neutral-100 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-neutral-800">Type</label>
                  <Select value={filterType || "all"} onValueChange={(v) => setFilterType(v === "all" ? "" : v)}>
                    <SelectTrigger className="border-neutral-200">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      {types.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-neutral-800">Sector</label>
                  <Select value={filterSector || "all"} onValueChange={(v) => setFilterSector(v === "all" ? "" : v)}>
                    <SelectTrigger className="border-neutral-200">
                      <SelectValue placeholder="All sectors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All sectors</SelectItem>
                      {sectors.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-neutral-800">Master</label>
                  <Select value={filterMaster || "all"} onValueChange={(v) => setFilterMaster(v === "all" ? "" : v)}>
                    <SelectTrigger className="border-neutral-200">
                      <SelectValue placeholder="All masters" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All masters</SelectItem>
                      {masters.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {hasFilters && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-100">
                  <span className="text-sm font-medium text-vtk-blue-dark">
                    Active filters:
                  </span>
                  {filterType && (
                    <Badge
                      variant="secondary"
                      className="gap-1 cursor-pointer border-vtk-blue/15 bg-vtk-light/80 text-vtk-blue-dark hover:bg-vtk-blue/10"
                      onClick={() => setFilterType("")}
                    >
                      {types.find((t) => t.id === filterType)?.name}
                      <X className="h-3 w-3" />
                    </Badge>
                  )}
                  {filterSector && (
                    <Badge
                      variant="secondary"
                      className="gap-1 cursor-pointer border-vtk-blue/15 bg-vtk-light/80 text-vtk-blue-dark hover:bg-vtk-blue/10"
                      onClick={() => setFilterSector("")}
                    >
                      {sectors.find((s) => s.id === filterSector)?.name}
                      <X className="h-3 w-3" />
                    </Badge>
                  )}
                  {filterMaster && (
                    <Badge
                      variant="secondary"
                      className="gap-1 cursor-pointer border-vtk-blue/15 bg-vtk-light/80 text-vtk-blue-dark hover:bg-vtk-blue/10"
                      onClick={() => setFilterMaster("")}
                    >
                      {masters.find((m) => m.id === filterMaster)?.name}
                      <X className="h-3 w-3" />
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="ml-auto text-vtk-blue hover:text-vtk-blue-dark hover:bg-vtk-blue/5"
                  >
                    Clear all
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results */}
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-28 rounded-2xl bg-vtk-light/50 border border-neutral-100 animate-pulse"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-neutral-200/80 bg-white shadow-sm">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-vtk-blue/10">
                <Building2 className="h-7 w-7 text-vtk-blue" />
              </div>
              <p className="text-lg text-neutral-700">
                {hasFilters
                  ? "No vacancies match your filters."
                  : "No vacancies available at the moment."}
              </p>
              {hasFilters && (
                <Button
                  variant="outline"
                  className="mt-6 border-vtk-blue/30 text-vtk-blue hover:bg-vtk-blue/5"
                  onClick={clearFilters}
                >
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-vtk-blue-dark mb-4">
                {filtered.length} {filtered.length === 1 ? "vacancy" : "vacancies"} found
              </p>
              <div className="space-y-3">
                {filtered.map((v) => (
                  <VacancyCard key={v.id} vacancy={v} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
