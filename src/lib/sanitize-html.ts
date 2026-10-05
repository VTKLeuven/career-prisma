import "server-only";

import DOMPurify from "isomorphic-dompurify";

/**
 * Rich text that company representatives write (their descriptions) and that
 * public pages render with dangerouslySetInnerHTML. Keeps formatting, links
 * and images; drops scripts, event handlers, forms, embeds and <style>.
 */
export function sanitizeRichText(html: string | null | undefined): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    FORBID_TAGS: ["style", "form", "input", "button", "textarea", "select", "iframe", "object", "embed"],
    FORBID_ATTR: ["style"],
  });
}
