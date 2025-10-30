"use client"

import * as React from "react";
import { useEffect, useState } from 'react';
import { fetchCompanyByIdAction } from "@/app/actions/companies";
import { Company, DirectusUser } from '@/lib/schema';
import Image from "next/image";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconPlus } from "@tabler/icons-react";
import { getDirectusImageUrl } from "@/components/Images";
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUser } from "@/providers/UserProvider";
import { IconBuilding, IconMail, IconTaxEuro } from "@tabler/icons-react";

export default function CompanyUsersPage() {
  const { user } = useUser();
  const [company, setCompany] = useState<Company | null>(null);

  useEffect(() => {
      async function loadCompany() {
        if (!user?.company) return;
        try {
          const fetchedCompany = await fetchCompanyByIdAction(user.company.id);
          setCompany(fetchedCompany ?? null);
        } catch (err) {
          console.error("Error fetching company:", err);
          setCompany(null);
        }
      }
      loadCompany();
  }, [user?.company]);

  return (
    <>
      <CompanyHeaderCard company={company ?? undefined} />
      <UsersOverview company={company ?? undefined} />
    </>
  );
}

// --- Company Header ---
function CompanyHeaderCard({ company }: { company: Company | undefined }) {
  if (!company) return (
    <Card className="rounded-2xl shadow-md bg-slate-700 text-white">
      <CardHeader>
        <CardTitle>Company Profile</CardTitle>
      </CardHeader>
    </Card>
  );

  const logoSrc = company.logo && typeof company.logo === "string" ? getDirectusImageUrl(company.logo) : null;

  return (
    <Card className="rounded-2xl shadow-md bg-slate-700 text-white">
      <CardHeader className="flex items-center gap-4">
        {logoSrc && (
          <img src={logoSrc} alt={company.name || "logo"} className="h-12 w-12 object-contain rounded-lg" />
        )}
        <div>
          <CardTitle>{company.name || "Company Profile"}</CardTitle>
          {company.address_city && <CardDescription>{company.address_city}</CardDescription>}
        </div>
      </CardHeader>
    </Card>
  );
}

// --- Users Overview ---
export function UsersOverview({ company }: { company?: Company }) {
  const representatives = company?.representatives ?? [];
  const users = representatives.map((rep: any) => rep.user_id ? rep.user_id : rep);

  if (!users.length) return null;

  return (
    <section id="team" className="relative border-t bg-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(40%_30%_at_10%_90%,rgba(255,210,0,0.08),transparent),radial-gradient(40%_30%_at_90%_10%,rgba(14,77,140,0.06),transparent)]"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-16">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Company Representatives</h2>
            <p className="mt-2 max-w-2xl text-neutral-600">
              These are your company representatives who have access to the platform.
            </p>
          </div>
          <RepFormDialog />
        </div>

        <motion.ul
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
          className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-3"
        >
          {users.map((user, i) => (
            <motion.li
              key={user.id ?? i}
              variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
              whileHover={{ y: -4, rotate: i % 2 ? -0.8 : 0.8 }}
              className="group relative cursor-pointer"
            >
              <div className="rounded-[28px] bg-white/90 p-5 text-center shadow-[0_10px_40px_rgba(11,77,140,0.08)] ring-1 ring-black/5 backdrop-blur-md hover:shadow-lg transition-shadow duration-200">
                <div className="mx-auto h-24 w-24 overflow-hidden rounded-full ring-4 ring-vtk-light transition-transform duration-300 group-hover:scale-105">
                  {user.avatar ? (
                    <Image
                      src={getDirectusImageUrl(user.avatar)!}
                      alt={`${user.first_name ?? ""} ${user.last_name ?? ""}`}
                      width={96}
                      height={96}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-neutral-400">
                      <span className="text-3xl">{(user.first_name?.[0] ?? "") + (user.last_name?.[0] ?? "")}</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 text-base font-semibold tracking-tight text-neutral-900">
                  {user.first_name} {user.last_name}
                </div>
                {user.title && <div className="mt-1 text-xs font-medium text-vtk-blue/90">{user.title}</div>}
              </div>
              <div aria-hidden className="absolute inset-x-8 -bottom-3 h-6 rounded-full bg-black/10 blur-md opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}

// --- Rep Form Dialog ---
function RepFormDialog() {
  const [open, setOpen] = React.useState(false);
  const [salesperson, setSalesperson] = React.useState<string>("");

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setOpen(false);
    (e.target as HTMLFormElement).reset();
    setSalesperson("");
    console.log("Form submitted");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><IconPlus />Request</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Request New Representative</DialogTitle>
            <DialogDescription>Fill in the representative details below.</DialogDescription>
          </DialogHeader>

          <div className="w-full">
            <Label htmlFor="repFirstName" className="text-xs">First Name*</Label>
            <Input name="repFirstName" id="repFirstName" required />
          </div>
          <div className="w-full">
            <Label htmlFor="repLastName" className="text-xs">Last Name*</Label>
            <Input name="repLastName" id="repLastName" required />
          </div>
          <div className="w-full">
            <Label htmlFor="repMail" className="text-xs">E-mail address*</Label>
            <Input name="repMail" id="repMail" required />
          </div>
          <div className="w-full">
            <Label htmlFor="repTel" className="text-xs">Phone number*</Label>
            <Input name="repTel" id="repTel" required />
          </div>
          <div className="w-full">
            <Label htmlFor="repFun" className="text-xs">Function</Label>
            <Input name="repFun" id="repFun" />
          </div>
          {/* <div className="w-full">
            <Label htmlFor="repAvatar" className="text-xs">Profile Picture</Label>
            <Input name="repAvatar" id="repAvatar" required />
          </div> */}

          <DialogFooter>
            <div className="flex gap-2">
              <Button type="submit" disabled={!salesperson}>Submit</Button>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
