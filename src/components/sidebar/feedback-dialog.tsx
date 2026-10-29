"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { adminFeedbackUrl, DOPL_ORIGIN } from "./admin-nav";
import type { AppUser } from "@/lib/schema";

/**
 * "Feedback / IT Support" from the sidebar: Dopl's intake form in a modal,
 * instead of a new tab, the same way vtk.be shows its website feedback.
 *
 * Deliberately not Dopl's `embed.js`: that puts a floating button on every
 * page and loads an external script for everyone. This loads Dopl only after
 * a click, but speaks the same protocol: `?embed=modal`, and the messages
 * `dopl:resize` and `dopl:close`, accepted only from Dopl and this iframe.
 *
 * Dopl's form carries its own title and close button, so the modal is only a
 * frame; below it sit a link to the form in a new tab and a close button, for
 * when Dopl does not load.
 */
export function FeedbackDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AppUser;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] gap-0 overflow-hidden p-0 sm:max-w-[560px]"
      >
        <DialogTitle className="sr-only">Feedback / IT Support</DialogTitle>
        <DialogDescription className="sr-only">
          Report a problem or ask IT for help. The form is sent to Dopl.
        </DialogDescription>
        {/* Mounted only while open, so Dopl loads on the click and a second
            opening starts from an empty form. */}
        {open && <FeedbackFrame user={user} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function FeedbackFrame({ user, onClose }: { user: AppUser; onClose: () => void }) {
  const frameRef = React.useRef<HTMLIFrameElement>(null);
  const [src] = React.useState(() => adminFeedbackUrl(user, window.location.origin));
  const [height, setHeight] = React.useState<number | null>(null);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    // Only from Dopl and only from this iframe: any window can post messages,
    // and "close" or "grow to 9000 px" from anywhere else is not ours.
    function onMessage(event: MessageEvent) {
      if (event.origin !== DOPL_ORIGIN || event.source !== frameRef.current?.contentWindow) return;
      const data = (event.data ?? {}) as { type?: unknown; height?: unknown };
      if (data.type === "dopl:close") onClose();
      if (data.type === "dopl:resize" && typeof data.height === "number") {
        setHeight(Math.ceil(data.height));
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onClose]);

  return (
    <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
      <div className="relative min-h-[420px] overflow-y-auto">
        {!loaded && (
          <p role="status" className="absolute inset-0 grid place-items-center text-[13px] text-muted-foreground">
            Loading the form…
          </p>
        )}
        <iframe
          ref={frameRef}
          src={src}
          title="Feedback / IT Support"
          className="block w-full border-0"
          style={{ height: height ?? 560, visibility: loaded ? "visible" : "hidden" }}
          onLoad={() => {
            setLoaded(true);
            frameRef.current?.focus();
          }}
        />
      </div>
      <p className="flex items-center justify-end gap-3 border-t px-4 py-2 text-[12px] text-muted-foreground">
        <a
          href={adminFeedbackUrl(user)}
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-2 hover:text-foreground hover:underline"
        >
          Open in a new tab
        </a>
        <span aria-hidden="true">·</span>
        {/* Also when Dopl does not load, and its own close button is not there. */}
        <button type="button" onClick={onClose} className="underline-offset-2 hover:text-foreground hover:underline">
          Close
        </button>
      </p>
    </div>
  );
}
