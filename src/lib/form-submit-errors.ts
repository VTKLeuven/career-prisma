/** Shown when a stale application session interrupts form submission. */
export const FORM_SUBMIT_SESSION_TIMEOUT_MESSAGE =
  "Your session timed out. Your answers are still here—please try submitting again.";

export function isSessionTokenExpiredError(error: unknown): boolean {
  if (error == null) return false;
  if (typeof error === "object") {
    const e = error as Record<string, unknown>;
    const msg = typeof e.message === "string" ? e.message : "";
    if (/token expired/i.test(msg)) return true;
    const errors = e.errors;
    if (Array.isArray(errors)) {
      for (const item of errors) {
        if (item && typeof item === "object") {
          const code = (item as { extensions?: { code?: string } }).extensions?.code;
          if (code === "TOKEN_EXPIRED") return true;
        }
      }
    }
  }
  try {
    const s = typeof error === "string" ? error : JSON.stringify(error);
    if (s.includes("TOKEN_EXPIRED") || /token expired/i.test(s)) return true;
  } catch {
    /* ignore */
  }
  return false;
}

/** Maps server-action errors to short, user-safe copy (keeps form state on the client). */
export function userFacingFormSubmitErrorMessage(error: unknown): string {
  if (isSessionTokenExpiredError(error)) {
    return FORM_SUBMIT_SESSION_TIMEOUT_MESSAGE;
  }
  if (error instanceof Error && error.message) {
    if (error.message === FORM_SUBMIT_SESSION_TIMEOUT_MESSAGE) {
      return FORM_SUBMIT_SESSION_TIMEOUT_MESSAGE;
    }
    if (/token expired/i.test(error.message)) {
      return FORM_SUBMIT_SESSION_TIMEOUT_MESSAGE;
    }
    if (error.message.length > 500 || error.message.trimStart().startsWith("{")) {
      return "Something went wrong while submitting. Please try again.";
    }
    return error.message;
  }
  return "Failed to submit form. Please try again.";
}
