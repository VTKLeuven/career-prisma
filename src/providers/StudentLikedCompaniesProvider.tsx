"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { toggleLikedCompanyAction } from "@/app/actions/student-liked-companies";
import { PENDING_LIKED_KEY } from "@/components/CompanyLikeButton";

type ContextValue = {
  isStudent: boolean | null;
  likedIds: Set<string>;
  toggleLike: (companyId: string, isLiked: boolean) => Promise<boolean>;
  togglingId: string | null;
};

const StudentLikedCompaniesContext = createContext<ContextValue>({
  isStudent: null,
  likedIds: new Set(),
  toggleLike: async () => false,
  togglingId: null,
});

export function useStudentLikedCompanies() {
  return useContext(StudentLikedCompaniesContext);
}

export function StudentLikedCompaniesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isStudent, setIsStudent] = useState<boolean | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const togglingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetch(`/api/user/check?t=${Date.now()}`, {
        cache: "no-store",
        credentials: "include",
      }),
      fetch("/api/students/liked-companies", { credentials: "include" }),
    ]).then(async ([checkRes, likedRes]) => {
      if (cancelled) return;

      const check = (await checkRes.json()) as { student?: { id: string } };
      if (!check.student?.id) {
        setIsStudent(false);
        return;
      }
      setIsStudent(true);

      let idsSet = new Set<string>();
      if (likedRes.ok) {
        const ids = (await likedRes.json()) as string[];
        idsSet = new Set(ids.map(String));
        setLikedIds(idsSet);
      } else {
        setLikedIds(idsSet);
      }

      // Process pending likes from localStorage (user liked while not logged in)
      if (typeof window !== "undefined") {
        try {
          const pending = JSON.parse(
            localStorage.getItem(PENDING_LIKED_KEY) ?? "[]"
          ) as string[];
          if (pending.length > 0) {
            const toAdd = pending.filter((id) => !idsSet.has(String(id)));
            for (const id of toAdd) {
              const result = await toggleLikedCompanyAction(String(id), false);
              if (result.success) idsSet.add(String(id));
            }
            localStorage.removeItem(PENDING_LIKED_KEY);
            if (!cancelled) setLikedIds(new Set(idsSet));
          }
        } catch {
          /* ignore */
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const toggleLike = useCallback(
    async (companyId: string, isLiked: boolean): Promise<boolean> => {
      if (togglingRef.current || !isStudent) return false;
      togglingRef.current = true;
      setTogglingId(companyId);
      try {
        const result = await toggleLikedCompanyAction(companyId, isLiked);
        if (result.success) {
          setLikedIds((prev) => {
            const next = new Set(prev);
            if (isLiked) next.delete(companyId);
            else next.add(companyId);
            return next;
          });
          return true;
        }
        return false;
      } finally {
        togglingRef.current = false;
        setTogglingId(null);
      }
    },
    [isStudent]
  );

  return (
    <StudentLikedCompaniesContext.Provider
      value={{ isStudent, likedIds, toggleLike, togglingId }}
    >
      {children}
    </StudentLikedCompaniesContext.Provider>
  );
}
