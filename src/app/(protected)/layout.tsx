export const dynamic = "force-dynamic";

import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ShellHeader } from "@/components/sidebar/shell-header";
import { ShellFont } from "@/components/sidebar/shell-font";
import Link from "next/link";
import { Inter } from "next/font/google";
import { getUserFromCookies } from "@/lib/auth-server";
import { getStudentFromCookies } from "@/lib/auth-student";
import { UserProvider } from "@/providers/UserProvider";
import { slugifyCompanyName } from "@/lib/utils/slugify";
import { hasCompanyPageAccess } from "@/lib/utils/company-access";
import type { Metadata } from "next";

// The back office uses Inter (as Dopl does); the public site keeps Geist.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
  },
};

export default async function WithSidebarLayout({ children }: { children: React.ReactNode }) {
  let user = await getUserFromCookies();

  if (!user) {
    const student = await getStudentFromCookies();
    if (student) {
      user = {
        id: student.id,
        name: `${student.first_name} ${student.last_name}`,
        email: student.email,
        admin: false,
        company: null,
        is_shifter: student.is_shifter,
        role: "Student",
      } as any;
    }
  }

  if (!user) {
    return (
      <div className="w-full min-h-svh flex flex-col gap-4 items-center justify-center">
        <p className="font-black text-2xl">VTK Career</p>
        <p>You’re not signed in.&nbsp;
          <a className="underline" href="/login">Sign in</a>
        </p>
      </div>
    );
  }

  return (
    <UserProvider key={user?.id ?? "anon"} initialUser={user}>
      <ShellFont className={`${inter.variable} app-ui`} />
      <SidebarProvider className={`${inter.variable} app-ui h-svh overflow-hidden bg-canvas`}>
        <AppSidebar />
        <SidebarInset className="min-h-0 overflow-hidden">
          <ShellHeader isAdmin={Boolean(user.admin)}>
            {user.company && (
              <Link
                href={
                  hasCompanyPageAccess(user.company)
                    ? `/company/${slugifyCompanyName(user.company.name)}`
                    : "/dashboard/settings/information/request-page"
                }
                title={`You are viewing this page as a representative for ${user.company.name}`}
                className="hidden max-w-[16rem] items-center gap-1.5 truncate rounded-lg border border-[#bee1ff] bg-[#f0f8ff] px-2.5 py-1 text-xs font-medium text-[#0a6cba] transition-colors hover:bg-[#deefff] sm:inline-flex"
              >
                <span className="text-[#0a6cba]/70">Viewing as</span>
                <span className="truncate">{user.company.name}</span>
              </Link>
            )}
          </ShellHeader>
          <div
            id="app-scroll"
            className="scrollbar-thin flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto"
          >
            <div className="flex w-full min-w-0 flex-col gap-4 px-3 pt-4 pb-10 sm:gap-6 sm:px-6 sm:pt-6 lg:px-8">
              {children}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </UserProvider>
  );
}
