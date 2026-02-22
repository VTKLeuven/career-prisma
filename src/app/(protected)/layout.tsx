export const dynamic = "force-dynamic";

import { AppSidebar } from "@/components/sidebar/app-sidebar";
import {
  SidebarInset, SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getUserFromCookies } from "@/lib/auth-server";
import { UserProvider } from "@/providers/UserProvider";
import { slugifyCompanyName } from "@/lib/utils/slugify";
import { hasCompanyPageAccess } from "@/lib/utils/company-access";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
  },
};

export default async function WithSidebarLayout({ children }: { children: React.ReactNode }) {
  const user = await getUserFromCookies();

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
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="px-2 sm:px-4 flex justify-between w-full items-center gap-2">
            <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-1 sm:mr-2 data-[orientation=vertical]:h-4 hidden sm:block" />
              {user.company && (
                <span className="text-muted-foreground text-xs sm:text-sm truncate">
                  You are viewing this page as a representative for{' '}
                  <Link 
                    href={
                      hasCompanyPageAccess(user.company)
                        ? `/company/${slugifyCompanyName(user.company.name)}`
                        : "/dashboard/settings/information/request-page"
                    }
                    className="underline cursor-pointer hover:text-foreground transition-colors"
                  >
                    {user.company.name}
                  </Link>
                </span>
              )}
            </div>
            {user.admin && <Button variant="link" className="shrink-0 text-xs sm:text-sm"><Link href="/admin">Admin</Link></Button>}
          </div>
        </header>
        <div className="flex flex-col gap-4 sm:gap-6 px-2 sm:px-4 pb-4">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
    </UserProvider>
  );
}
