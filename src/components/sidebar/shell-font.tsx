"use client";

import { useEffect } from "react";

/**
 * Dialogs, sheets and menus portal into <body>, outside the shell wrapper that
 * carries the `app-ui` class, so they would fall back to the public site's
 * font. Mirroring the class onto <body> while the shell is mounted keeps them
 * consistent; it is removed again when navigating to the public site.
 */
export function ShellFont({ className }: { className: string }) {
  useEffect(() => {
    const classes = className.split(/\s+/).filter(Boolean);
    document.body.classList.add(...classes);
    return () => document.body.classList.remove(...classes);
  }, [className]);
  return null;
}
