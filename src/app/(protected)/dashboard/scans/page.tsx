"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MyScansPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to all scans page
    router.replace("/dashboard/scans/all");
  }, [router]);

  return null;
}
