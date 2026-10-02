"use client"

import {
  Bell,
  ChevronsUpDown,
  LogOut,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSidebar } from "@/components/ui/sidebar"
import { IconMail, IconPhone, IconTie } from "@tabler/icons-react"
import { useRouter } from "next/navigation"
import { useUser } from "@/providers/UserProvider"
import { cn } from "@/lib/utils"

/** "Jarne Plessers" -> "JP"; falls back to the first letters of the email. */
export function initialsFor(name?: string | null, email?: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (email ?? "?").slice(0, 2).toUpperCase()
}

export function UserAvatar({
  name,
  email,
  className,
}: {
  name?: string | null
  email?: string | null
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full bg-[#fde2e2] text-[11px] font-semibold text-[#b91c1c]",
        className
      )}
    >
      {initialsFor(name, email)}
    </span>
  )
}

export function NavUser() {
  const { isMobile } = useSidebar()
  const router = useRouter();
  const { user } = useUser();

  const subtitle = user?.company?.name ?? (user?.role as string | undefined) ?? user?.email

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-[10px] p-1.5 text-left outline-none transition-colors hover:bg-[#f0f0f2] focus-visible:ring-2 focus-visible:ring-sidebar-ring data-[state=open]:bg-sidebar-accent"
        >
          <UserAvatar name={user?.name} email={user?.email} />
          <div className="grid min-w-0 flex-1 leading-tight">
            <span className="truncate text-[13px] font-medium text-foreground">{user?.name}</span>
            {subtitle && <span className="truncate text-xs text-muted-foreground">{subtitle}</span>}
          </div>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
        side={isMobile ? "bottom" : "right"}
        align="end"
        sideOffset={8}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2.5 px-1.5 py-1.5 text-left text-sm">
            <UserAvatar name={user?.name} email={user?.email} />
            <div className="grid flex-1 gap-0.5 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user?.name}</span>
              {user?.email && (
                <div className="flex items-center gap-1 text-muted-foreground"><IconMail size={12} /><span className="truncate text-xs">{user.email}</span></div>
              )}
              {user?.tel && (
                <div className="flex items-center gap-1 text-muted-foreground"><IconPhone size={12} /><span className="truncate text-xs">{user.tel}</span></div>
              )}
              {user?.role && (
                <div className="flex items-center gap-1 text-muted-foreground"><IconTie size={12} /><span className="truncate text-xs">{user.role as string}</span></div>
              )}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem>
          <Bell />
          Notifications
        </DropdownMenuItem>

        {(user?.is_shifter || user?.admin) && (
          <DropdownMenuItem onClick={() => router.push("/dashboard/shifter")}>
            <Bell className="text-orange-500" />
            Shifter Dashboard
          </DropdownMenuItem>
        )}

        <DropdownMenuItem onClick={async (e) => {
          e.preventDefault();
          await fetch("/api/logout", { method: "POST" });
          router.refresh(); // re-run server components so cookies are gone
        }}>
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
