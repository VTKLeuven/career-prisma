export const dynamic = "force-dynamic";

import { AppSidebar } from "@/components/sidebar/app-sidebar";
import {
  SidebarInset, SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getUserFromCookies } from "@/lib/auth-server";
import { UserProvider } from "@/providers/UserProvider";

export default async function WithSidebarLayout({ children }: { children: React.ReactNode }) {
  const user = await getUserFromCookies();
  console.log(user);

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
  console.log(user)

  return (
    <UserProvider key={user?.id ?? "anon"} initialUser={user}>
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="px-4 flex justify-between w-full items-center">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
              <span className="text-muted-foreground">You are viewing this page as a representative for <span className="underline cursor-pointer">{user.company.name}</span></span>
              {/* <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem><BreadcrumbLink href="/">Events</BreadcrumbLink></BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem><BreadcrumbLink href="/">My Events</BreadcrumbLink></BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem><BreadcrumbLink href="/">Jobfair</BreadcrumbLink></BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem><BreadcrumbPage>Onboarding</BreadcrumbPage></BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb> */}
            </div>
            {user.admin && <Button variant="link"><Link href="/admin">Admin Panel</Link></Button>}
          </div>
        </header>
        <div className="flex flex-col gap-6 px-4">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
    </UserProvider>
  );
}
