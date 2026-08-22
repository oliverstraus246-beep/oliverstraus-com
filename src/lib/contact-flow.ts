export type ContactField = "email" | "name" | "reason";

export function validateField(field: ContactField, value: string): string | null {
  if (field === "email") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      ? null
      : "That doesn't look like a valid email. Try again:";
  }
  if (field === "name") {
    return value.trim().length > 0 ? null : "Name can't be empty. Try again:";
  }
  return value.trim().length > 0 ? null : "Say a bit more. Try again:";
}

export type SubmitOutcome = { ok: true } | { ok: false; error: string };

// A failed submission must stay retryable -- the caller re-sends the same
// answers on the next Enter press, rather than the terminal locking up as
// if the user had done something wrong.
export function stepAfterSubmit(outcome: SubmitOutcome): "done" | "retry" {
  return outcome.ok ? "done" : "retry";
}
