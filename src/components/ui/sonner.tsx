"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * The app's toast outlet (sonner). A client wrapper on purpose: rendering
 * sonner's <Toaster> straight from the server layout gave it a different
 * module instance from the `toast()` that client components import, so
 * toasts never appeared.
 */
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="bottom-right"
      richColors
      closeButton
      // a toast often repeats what was typed; let a long value wrap
      toastOptions={{ classNames: { toast: "wrap-anywhere" } }}
      {...props}
    />
  );
}
