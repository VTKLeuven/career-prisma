// lib/utils/description-text.ts -- company descriptions are stored as simple
// HTML (<p> paragraphs, <br> line breaks) and edited as plain text in the
// company settings. Written without the DOM so that form can render on the
// server with the saved text already in place.

/** Line breaks to newlines, tags dropped, the common entities decoded. */
function blockToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/ /g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

/** Stored HTML to editable text: one blank line between paragraphs. */
export function htmlToPlainText(html: string | null | undefined): string {
  if (!html) return "";
  const paragraphs = Array.from(html.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/gi), (m) => m[1]);
  if (paragraphs.length > 0) {
    return paragraphs
      .map(blockToText)
      .filter((p) => p.trim().length > 0) // drop only completely empty paragraphs
      .join("\n\n");
  }
  return blockToText(html);
}

/** Edited text back to HTML: blank lines split paragraphs, single newlines become <br>. */
export function plainTextToHtml(text: string): string {
  if (!text || !text.trim()) return "";

  return text
    .split(/\n\n+/)
    .map((paragraph) => {
      const lines = paragraph
        .trim()
        .split(/\n/)
        // Escape HTML entities to prevent XSS
        .map((line) =>
          line
            .trim()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;")
        )
        .filter((line) => line.length > 0);
      return lines.length > 0 ? `<p>${lines.join("<br>")}</p>` : null;
    })
    .filter((p): p is string => p !== null)
    .join("");
}
