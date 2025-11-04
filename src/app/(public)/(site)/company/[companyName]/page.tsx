import { directus } from "@/lib/directus";
import { readItems } from "@directus/sdk";
import { Company, Master, CareerEventOption, CareerEvent } from "@/lib/schema";
import { getDirectusImageUrl } from "@/components/Images";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

type RouteParams = { companyName: string };

function slugifyName(name?: string | null): string {
  return (name ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "") // Remove special characters except hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
}

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

async function fetchCompanyBySlug(slug: string): Promise<Company | null> {
  try {
    const items = (await directus.request(
      readItems("company", {
        fields: [
          "*",
          "page_image",
          "category.master_id.*",
          // include options and their linked event for event listings
          "options.career_event_option_id.id",
          "options.career_event_option_id.name",
          "options.career_event_option_id.description",
          "options.career_event_option_id.price",
          "options.career_event_option_id.event.*",
        ],
        limit: 200,
        sort: "name",
      })
    )) as unknown as Company[];

    // Debug: log all company slugs for troubleshooting
    if (process.env.NODE_ENV === "development") {
      console.log("Looking for slug:", slug);
      console.log("Available companies:", (items || []).map(c => ({
        name: c.name,
        slug: slugifyName(c.name)
      })));
    }

    const match = (items || []).find((c) => {
      const companySlug = slugifyName(c.name);
      return companySlug === slug;
    });
    
    if (!match) {
      if (process.env.NODE_ENV === "development") {
        console.log("No match found for slug:", slug);
      }
      return null;
    }

    const rawCategory: unknown[] = Array.isArray(match.category)
      ? (match.category as unknown[])
      : [];
    const normalizedCategories: Master[] = rawCategory
      .filter(isCategoryJunction)
      .map((item) => item.master_id)
      .filter((m): m is Master => Boolean(m));

    const rawOptions: unknown[] = Array.isArray(match.options)
      ? (match.options as unknown[])
      : [];
    const normalizedOptions: CareerEventOption[] = rawOptions
      .filter(isOptionJunction)
      .map((item) => item.career_event_option_id)
      .filter((o): o is CareerEventOption => Boolean(o));

    const normalized: Company = {
      ...match,
      category: normalizedCategories,
      options: normalizedOptions,
    };
    return normalized;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching company by slug:", error);
    }
    return null;
  }
}

export default async function CompanyPage({ params }: { params: Promise<RouteParams> }) {
  const { companyName } = await params;
  if (companyName.includes("_")) {
    redirect(`/company/${companyName.replace(/_/g, "-")}`);
  }
  const normalizedSlug = companyName;
  const company = await fetchCompanyBySlug(normalizedSlug);

  if (!company) {
    return (
      <main className="min-h-svh bg-vtk-bg text-neutral-900">
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
                  <h2 className="text-xl font-semibold text-neutral-900">Events with this company</h2>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {events.map((ev) => {
                      const href = `/event/${(ev.name || "").toLowerCase().replace(/\s+/g, "-")}`;
                      const img = getDirectusImageUrl(ev.image);
                      return (
                        <Link key={ev.id} href={href} className="group rounded-xl border overflow-hidden bg-neutral-50 hover:bg-neutral-100 transition-colors">
                          {img && (
                            <div className="relative h-32 w-full overflow-hidden">
                              <Image src={img} alt={ev.name} fill className="object-cover group-hover:scale-[1.02] transition-transform" />
                            </div>
                          )}
                          <div className="p-4">
                            <div className="text-sm font-semibold text-neutral-900">{ev.name}</div>
                            <div className="text-xs text-neutral-600 mt-1">{ev.date} · {ev.location}</div>
                          </div>
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


