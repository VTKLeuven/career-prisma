'use client'

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Company, Master, CareerEventOption, CareerEvent } from "@/lib/schema";
import { getDirectusImageUrl } from "@/components/Images";
import Image from "next/image";
import Link from "next/link";
import { Calendar } from "lucide-react";
import { fetchCompanyBySlugAction } from "@/app/actions/companies";

type CategoryJunction = { master_id: Master | null };
type OptionJunction = { career_event_option_id: CareerEventOption | null };

function isCategoryJunction(value: unknown): value is CategoryJunction {
  return (
    typeof value === "object" &&
    value !== null &&
    "master_id" in value
  );
}

function isOptionJunction(value: unknown): value is OptionJunction {
  return (
    typeof value === "object" &&
    value !== null &&
    "career_event_option_id" in value
  );
}

export default function CompanyPage() {
  const params = useParams();
  const router = useRouter();
  const companyName = Array.isArray(params.companyName) ? params.companyName[0] : params.companyName;
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyName || typeof companyName !== "string") {
      setLoading(false);
      return;
    }
    
    // Redirect if underscore found
    if (companyName.includes("_")) {
      router.replace(`/company/${companyName.replace(/_/g, "-")}`);
      return;
    }

    async function loadCompany() {
      try {
        const fetched = await fetchCompanyBySlugAction(companyName ?? "");
        if (fetched) {
          // Normalize categories and options
          const rawCategory: unknown[] = Array.isArray(fetched.category)
            ? (fetched.category as unknown[])
            : [];
          const normalizedCategories: Master[] = rawCategory
            .filter(isCategoryJunction)
            .map((item) => item.master_id)
            .filter((m): m is Master => Boolean(m));

          const rawOptions: unknown[] = Array.isArray(fetched.options)
            ? (fetched.options as unknown[])
            : [];
          const normalizedOptions: CareerEventOption[] = rawOptions
            .filter(isOptionJunction)
            .map((item) => item.career_event_option_id)
            .filter((o): o is CareerEventOption => Boolean(o));

          setCompany({
            ...fetched,
            category: normalizedCategories,
            options: normalizedOptions,
          });
        } else {
          setCompany(null);
        }
      } catch (error) {
        console.error("Error fetching company:", error);
        setCompany(null);
      } finally {
        setLoading(false);
      }
    }

    loadCompany();
  }, [companyName, router]);

  if (loading) {
    return (
      <main className="min-h-svh bg-vtk-bg text-neutral-900 pt-24 md:pt-28">
        <div className="mx-auto max-w-7xl px-4 py-24">
          <div className="rounded-2xl border bg-white p-10 shadow-sm">
            <p className="text-neutral-600">Loading company...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!company) {
    return (
      <main className="min-h-svh bg-vtk-bg text-neutral-900 pt-24 md:pt-28">
        <div className="mx-auto max-w-7xl px-4 py-24">
          <div className="rounded-2xl border bg-white p-10 shadow-sm">
            <h1 className="text-2xl font-semibold text-neutral-900">Company not found</h1>
            <p className="mt-2 text-neutral-600">We couldn&apos;t find this company. It may be private or the link is incorrect.</p>
            <div className="mt-6">
              <Link href="/" className="text-vtk-blue underline">Go back home</Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const logoUrl = getDirectusImageUrl(company.logo);
  const categories = (company.category as Master[] | undefined) ?? [];
  const bgUrl = getDirectusImageUrl(company.page_image);
  const events: CareerEvent[] = Array.from(
    new Map(
      ((company.options as CareerEventOption[] | undefined) ?? [])
        .map((opt) => opt?.event)
        .filter((e): e is CareerEvent => !!e)
        .map((e) => [e.id, e])
    ).values()
  );

  return (
    <main className="relative min-h-svh bg-vtk-bg text-neutral-900 pt-24 md:pt-28">
      {bgUrl && (
        <div className="absolute inset-0 z-0">
          <Image src={bgUrl} alt={company.name} fill className="object-cover" />
        </div>
      )}
      <div className="relative z-10">
      <section className="relative">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="rounded-2xl border bg-white/85 backdrop-blur-sm p-6 shadow-sm">
            <div className="flex items-center gap-5">
              <div className="h-20 w-20 shrink-0 rounded-xl border bg-neutral-50 flex items-center justify-center overflow-hidden">
                {logoUrl ? (
                  <Image src={logoUrl} alt={company.name} width={80} height={80} className="object-contain" />
                ) : (
                  <span className="text-sm text-neutral-500">No logo</span>
                )}
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">{company.name}</h1>
                {/* Website removed from header */}
                {categories.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-3">
                    {categories.map((cat) => {
                      const catLogo = getDirectusImageUrl(cat.logo);
                      if (!catLogo) return null;
                      return (
                        <span
                          key={cat.id}
                          className="relative w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-transparent"
                        >
                          <Image src={catLogo} alt="" width={32} height={32} className="object-contain transform scale-110" />
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 flex flex-col gap-6">
              {company.short_description && (
                <div className="rounded-2xl border bg-white/85 backdrop-blur-sm p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-neutral-900">About</h2>
                  <div className="prose max-w-none mt-3" dangerouslySetInnerHTML={{ __html: company.short_description || "" }} />
                </div>
              )}

              {company.long_description && (
                <div className="rounded-2xl border bg-white/85 backdrop-blur-sm p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-neutral-900">More details</h2>
                  <div className="prose max-w-none mt-3" dangerouslySetInnerHTML={{ __html: company.long_description || "" }} />
                </div>
              )}

              {events.length > 0 && (
                <div className="rounded-2xl border bg-white/85 backdrop-blur-sm p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-neutral-900 mb-6">Attending at</h2>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    {events.slice(0, 3).map((event, i) => {
                      const href = `/event/${(event.name || "").toLowerCase().replace(/\s+/g, "-")}`;
                      return (
                        <Link
                          key={event.id}
                          href={href}
                          className="group relative block"
                        >
                          <div className="rounded-[28px] bg-white/90 p-3 shadow-[0_10px_40px_rgba(11,77,140,0.08)] ring-1 ring-black/5 backdrop-blur-md transition-transform duration-300 hover:-translate-y-2 hover:rotate-1">
                            <div className="relative overflow-hidden rounded-[20px]">
                              <div className="aspect-[4/3]">
                                {event.image && (
                                  <Image
                                    src={getDirectusImageUrl(event.image)!}
                                    alt={event.name}
                                    fill
                                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                                  />
                                )}
                              </div>
                              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                              {event.shout ? (
                                <span className="absolute left-3 top-3 rounded-full bg-vtk-yellow px-2 py-0.5 text-xs font-bold text-black shadow-sm">
                                  {event.shout}
                                </span>
                              ) : null}
                            </div>
                            <div className="px-2 pb-2 pt-3">
                              <div className="text-base font-semibold tracking-tight text-neutral-900">{event.name}</div>
                              <div className="mt-1 flex items-center gap-2 text-sm text-neutral-700">
                                <Calendar className="h-4 w-4 text-vtk-blue" />
                                <span>{event.date} · {event.location}</span>
                              </div>
                            </div>
                          </div>
                          <div aria-hidden className="absolute inset-x-6 -bottom-3 h-6 rounded-full bg-black/10 blur-md opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <aside className="flex flex-col gap-6">
              {company.location && (
                <div className="rounded-2xl border bg-white/85 backdrop-blur-sm p-6 shadow-sm">
                  <h3 className="text-base font-semibold text-neutral-900">Located at</h3>
                  <div className="mt-2 text-sm text-neutral-700">{company.location}</div>
                </div>
              )}
              {(company.address_city || company.address_country || company.address_street) && (
                <div className="rounded-2xl border bg-white/85 backdrop-blur-sm p-6 shadow-sm">
                  <h3 className="text-base font-semibold text-neutral-900">Headquarters</h3>
                  <div className="mt-2 text-sm text-neutral-700">
                    <div>{[company.address_street, company.address_number].filter(Boolean).join(" ")}</div>
                    <div>{[company.address_zip, company.address_city].filter(Boolean).join(" ")}</div>
                    <div>{company.address_country}</div>
                  </div>
                </div>
              )}

              {company.website && (
                <div className="rounded-2xl border bg-white/85 backdrop-blur-sm p-6 shadow-sm">
                  <h3 className="text-base font-semibold text-neutral-900">Website</h3>
                  <div className="mt-2">
                    <Link href={company.website} target="_blank" className="text-vtk-blue underline break-all">{company.website}</Link>
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      </section>
      </div>
    </main>
  );
}


