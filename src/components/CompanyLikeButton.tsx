"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Star, Loader2 } from "lucide-react";
import { useStudentLikedCompanies } from "@/providers/StudentLikedCompaniesProvider";

const PENDING_LIKED_KEY = "pendingLikedCompanies";

function addPendingLike(companyId: string) {
  try {
    const pending = JSON.parse(localStorage.getItem(PENDING_LIKED_KEY) ?? "[]") as string[];
    if (!pending.includes(companyId)) pending.push(companyId);
    localStorage.setItem(PENDING_LIKED_KEY, JSON.stringify(pending));
  } catch {}
}

export { PENDING_LIKED_KEY };

type Props = {
  companyId: string;
  /** When in floorplan popup, pass booth id to reopen popup after login */
  popupBoothId?: string;
  /** Additional class for the button. Default includes absolute top-3 right-3. */
  className?: string;
  /** When true, use compact styling (e.g. for list items) */
  compact?: boolean;
  /** When true, no absolute positioning - flows inline (e.g. in flex container) */
  inline?: boolean;
};

/**
 * Star button for students to like/unlike companies.
 * Always visible. When not logged in, clicking redirects to student login.
 */
export function CompanyLikeButton({
  companyId,
  popupBoothId,
  className = "",
  compact = false,
  inline = false,
}: Props) {
  const pathname = usePathname();
  const { isStudent, likedIds, toggleLike, togglingId } =
    useStudentLikedCompanies();

  const isLiked = likedIds.has(companyId);
  const toggling = togglingId === companyId;
  const needsLogin = isStudent === false;
  const isLoading = isStudent === null;

  async function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (toggling || isLoading || needsLogin) return;
    await toggleLike(companyId, isLiked);
  }

  function handleLoginClick(e: React.MouseEvent) {
    e.stopPropagation();
    addPendingLike(companyId);
  }

  const baseClass =
    "z-10 p-1.5 rounded-full bg-white/90 shadow-sm hover:bg-white transition-colors disabled:opacity-50";
  const posClass = inline ? "" : compact ? "absolute top-2 right-2" : "absolute top-3 right-3";
  const sizeClass = compact ? "h-4 w-4" : "h-5 w-5";

  const redirectTo = pathname
    ? pathname + (popupBoothId ? `?popupBooth=${encodeURIComponent(popupBoothId)}` : "")
    : "/";
  const loginUrl = `/student-login?redirectTo=${encodeURIComponent(redirectTo)}`;

  const content = (
    <>
      {toggling ? (
        <Loader2 className={`${sizeClass} animate-spin text-muted-foreground`} />
      ) : (
        <Star
          className={`${sizeClass} ${
            isLiked ? "fill-amber-300 text-amber-400" : "text-muted-foreground"
          }`}
        />
      )}
    </>
  );

  if (needsLogin) {
    return (
      <Link
        href={loginUrl}
        onClick={handleLoginClick}
        className={`${posClass} ${baseClass} ${className}`}
        aria-label="Log in to add to favourites"
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={toggling || isLoading}
      className={`${posClass} ${baseClass} ${className}`}
      aria-label={isLiked ? "Remove from favourites" : "Add to favourites"}
    >
      {content}
    </button>
  );
}
