"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CompanyLikeButton } from "@/components/CompanyLikeButton";
import { getDirectusImageUrl } from "@/components/Images";
import { slugifyCompanyName } from "@/lib/utils/slugify";
import { hasCompanyPageAccess } from "@/lib/utils/company-access";
import { fetchLikedCompaniesAction } from "@/app/actions/student-liked-companies";
import { Star } from "lucide-react";

export default function LikedCompaniesPage() {
  const [companies, setCompanies] = useState<Array<{ id: string; name?: string; logo?: string; status?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<{ id: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [checkRes, companiesData] = await Promise.all([
          fetch("/api/user/check", { cache: "no-store", credentials: "include" }),
          fetchLikedCompaniesAction(),
        ]);

        if (cancelled) return;

        const check = (await checkRes.json()) as { student?: { id: string } };
        if (!check.student?.id) {
          setStudent(null);
          setCompanies([]);
          setLoading(false);
          return;
        }

        setStudent({ id: check.student.id });
        setCompanies(companiesData);
      } catch {
        if (!cancelled) {
          setStudent(null);
          setCompanies([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="container max-w-5xl mx-auto py-12 px-4">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Loading...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-vtk-blue/5 via-white to-vtk-yellow/5 flex items-center justify-center px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-neutral-900 mb-4">Liked companies</h1>
          <p className="text-lg text-neutral-600 mb-8">
            You need to be logged in as a student to view your liked companies.
          </p>
          <Button asChild className="rounded-full bg-vtk-blue text-white">
            <Link href={`/student-login?redirectTo=${encodeURIComponent("/student/liked-companies")}`}>
              Student Login
            </Link>
          </Button>
          <div className="mt-6">
            <Button asChild variant="outline">
              <Link href="/">Back to home</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto py-12 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Star className="h-6 w-6 fill-amber-300 text-amber-400" />
            Liked companies
          </CardTitle>
          <CardDescription>
            Companies you&apos;ve added to your favourites. Click through to view their company page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {companies.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {[...companies]
                .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", undefined, { sensitivity: "base" }))
                .map((c) => {
                const hasPage = hasCompanyPageAccess(c);
                const logoUrl = c.logo ? getDirectusImageUrl(c.logo) : null;
                const cardInner = (
                  <div className="group relative flex h-full min-h-[200px] flex-col items-center rounded-xl border border-border/60 bg-card p-5 text-center transition-colors hover:border-vtk-blue/30 hover:bg-muted/30">
                    <div className="flex h-14 shrink-0 items-center justify-center">
                      {logoUrl ? (
                        <Image
                          src={logoUrl}
                          alt=""
                          width={80}
                          height={56}
                          className="max-h-14 object-contain"
                          unoptimized
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">No logo</span>
                      )}
                    </div>
                    <h4 className="mt-3 h-12 break-words font-semibold text-foreground leading-tight line-clamp-2" title={c.name ?? undefined}>
                      {c.name ?? "Unknown company"}
                    </h4>
                    {hasPage && (
                      <span className="mt-auto shrink-0 pt-3 text-xs text-vtk-blue group-hover:underline">
                        View company page →
                      </span>
                    )}
                  </div>
                );
                return (
                  <div key={c.id} className="min-h-[200px] relative">
                    <CompanyLikeButton companyId={c.id} />
                    {hasPage ? (
                      <Link href={`/company/${slugifyCompanyName(c.name) || c.id}`} className="block h-full">
                        {cardInner}
                      </Link>
                    ) : (
                      cardInner
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              You haven&apos;t liked any companies yet. Browse the floorplan or explore companies to add favourites.
            </p>
          )}
          <Button asChild variant="outline">
            <Link href="/event/vtk-jobfair">Explore jobfair</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
