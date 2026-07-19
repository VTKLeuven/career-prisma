"use client"

import * as React from "react";
import { useEffect, useState } from 'react';
import { fetchCompanyByIdAction, requestRepAction } from "@/app/actions/companies";
import { Company, CompanyRep } from '@/lib/schema';
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { IconPlus } from "@tabler/icons-react";
import { getFileUrl } from "@/components/Images";
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
import { useUser } from "@/providers/UserProvider";


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
      <UsersOverview company={company ?? undefined} />
    </>
  );
}

// --- Users Overview ---
function UsersOverview({ company }: { company?: Company }) {
  const representatives = company?.representatives ?? [];
  const users = representatives.filter((rep): rep is NonNullable<CompanyRep> => rep !== null);

  if (!users.length) return null;

  return (
    <section id="team" className="relative border-t bg-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(40%_30%_at_10%_90%,rgba(255,210,0,0.08),transparent),radial-gradient(40%_30%_at_90%_10%,rgba(14,77,140,0.06),transparent)]"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:py-16">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight md:text-3xl">Company Representatives</h2>
            <p className="mt-2 max-w-2xl text-sm sm:text-base text-neutral-600">
              These are your company representatives who have access to the platform.
            </p>
          </div>
          <RepFormDialog company={company} />
        </div>

        <motion.ul
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
          className="mt-6 sm:mt-8 grid grid-cols-2 gap-4 sm:gap-5 sm:grid-cols-3 lg:grid-cols-3"
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
                      src={getFileUrl(user.avatar)!}
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
function RepFormDialog({ company }: { company?: Company }) {
  const [open, setOpen] = React.useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const firstName = String(fd.get("firstName") ?? "").trim();
    const lastName = String(fd.get("lastName") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const number = String(fd.get("number") ?? "").trim();
    const funct = String(fd.get("funct") ?? "").trim();

    const newRep: Partial<CompanyRep> = {
      first_name: firstName,
      last_name: lastName,
      email: email,
      tel: number,
      role: "d5475bf4-a77f-48de-b06c-fac199b0f631",
      title: funct,
      company: company,
    }

    requestRepAction(newRep)

    setOpen(false);
    (e.target as HTMLFormElement).reset();
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
            <Label htmlFor="firstName" className="text-xs">First Name*</Label>
            <Input name="firstName" id="firstName" required />
          </div>
          <div className="w-full">
            <Label htmlFor="lastName" className="text-xs">Last Name*</Label>
            <Input name="lastName" id="lastName" required />
          </div>
          <div className="w-full">
            <Label htmlFor="email" className="text-xs">E-mail address*</Label>
            <Input name="email" id="email" required />
          </div>
          <div className="w-full">
            <Label htmlFor="number" className="text-xs">Phone number*</Label>
            <Input name="number" id="number" required />
          </div>
          <div className="w-full">
            <Label htmlFor="funct" className="text-xs">Function</Label>
            <Input name="funct" id="funct" />
          </div>
          {/* <div className="w-full">
            <Label htmlFor="repAvatar" className="text-xs">Profile Picture</Label>
            <Input name="repAvatar" id="repAvatar" required />
          </div> */}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="submit" className="w-full sm:w-auto">Submit</Button>
            <DialogClose asChild>
              <Button variant="outline" className="w-full sm:w-auto">Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
