"use client";

import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type ConfirmOptions = {
  title: string;
  description?: string;
  /** The confirm button's label, e.g. "Delete". */
  confirmLabel?: string;
  /** A red confirm button, for deletes and other irreversible steps. */
  destructive?: boolean;
};

type Request = ConfirmOptions & { resolve: (ok: boolean) => void };

let show: ((request: Request) => void) | null = null;

/**
 * Asks for confirmation in an in-app dialog and resolves to the answer -- the
 * replacement for window.confirm(), as toast() is for alert(). Needs
 * <ConfirmDialogHost /> in the tree (the root layout mounts it); without it,
 * it falls back to window.confirm.
 */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  if (!show) {
    return Promise.resolve(window.confirm([options.title, options.description].filter(Boolean).join("\n\n")));
  }
  const open = show;
  return new Promise((resolve) => open({ ...options, resolve }));
}

export function ConfirmDialogHost() {
  const [request, setRequest] = useState<Request | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    show = (next) => {
      // A second question while one is open declines the first.
      setRequest((current) => {
        current?.resolve(false);
        return next;
      });
      setOpen(true);
    };
    return () => {
      show = null;
    };
  }, []);

  // The request stays set after answering, so the text doesn't blank out
  // while the dialog fades away; resolving twice is a no-op.
  const answer = (ok: boolean) => {
    request?.resolve(ok);
    setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && answer(false)}>
      <AlertDialogContent {...(!request?.description && { "aria-describedby": undefined })}>
        <AlertDialogHeader>
          <AlertDialogTitle>{request?.title}</AlertDialogTitle>
          {request?.description ? <AlertDialogDescription>{request.description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant={request?.destructive ? "destructive" : "default"} onClick={() => answer(true)}>
            {request?.confirmLabel ?? "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
