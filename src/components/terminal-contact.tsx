"use client";

import { useEffect, useRef, useState } from "react";
import {
  validateField,
  stepAfterSubmit,
  type ContactField,
  type SubmitOutcome,
} from "@/lib/contact-flow";

type Step = ContactField | "submitting" | "retry" | "done";

type Line = {
  text: string;
  tone: "prompt" | "input" | "error" | "success" | "muted";
};

const PROMPTS: Record<ContactField, string> = {
  email: "Please input your email:",
  name: "Please input your name:",
  reason: "Please state your reason for contacting:",
};

const TONE_CLASS: Record<Line["tone"], string> = {
  prompt: "text-foreground",
  input: "text-accent-blue",
  error: "text-destructive",
  success: "text-accent-blue",
  muted: "text-muted-foreground",
};

export function TerminalContact() {
  const [lines, setLines] = useState<Line[]>([
    { text: "Oliver Straus // secure contact channel", tone: "muted" },
    { text: "----------------------------------------", tone: "muted" },
    { text: PROMPTS.email, tone: "prompt" },
  ]);
  const [step, setStep] = useState<Step>("email");
  const [value, setValue] = useState("");
  const answersRef = useRef({ email: "", name: "", reason: "" });
  const inputRef = useRef<HTMLInputElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [step]);

  useEffect(() => {
    const el = transcriptRef.current;
    if (el && typeof el.scrollTo === "function") {
      el.scrollTo({ top: el.scrollHeight });
    }
  }, [lines]);

  function print(...newLines: Line[]) {
    setLines((prev) => [...prev, ...newLines]);
  }

  async function submit() {
    const outcome: SubmitOutcome = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...answersRef.current, website: "" }),
    })
      .then(async (res) => {
        const json = (await res.json()) as { ok?: boolean; error?: string };
        return res.ok && json.ok
          ? ({ ok: true } as const)
          : ({ ok: false, error: json.error ?? "Something went wrong." } as const);
      })
      .catch(() => ({ ok: false, error: "Connection failed." }) as const);

    if (outcome.ok) {
      print({ text: "Message received. I'll get back to you.", tone: "success" });
    } else {
      print(
        { text: outcome.error, tone: "error" },
        { text: "Press Enter to try again.", tone: "muted" },
      );
    }
    setStep(stepAfterSubmit(outcome));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (step === "retry") {
      setValue("");
      print({ text: "Retrying...", tone: "muted" });
      setStep("submitting");
      void submit();
      return;
    }

    const field = step as ContactField;
    const error = validateField(field, value);
    if (error) {
      print({ text: value, tone: "input" }, { text: error, tone: "error" });
      setValue("");
      return;
    }

    answersRef.current[field] = value;
    setValue("");

    if (field === "email") {
      print({ text: value, tone: "input" }, { text: PROMPTS.name, tone: "prompt" });
      setStep("name");
    } else if (field === "name") {
      print({ text: value, tone: "input" }, { text: PROMPTS.reason, tone: "prompt" });
      setStep("reason");
    } else {
      print({ text: value, tone: "input" }, { text: "Sending...", tone: "muted" });
      setStep("submitting");
      void submit();
    }
  }

  const inputDisabled = step === "submitting" || step === "done";

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card transition-colors duration-200 focus-within:border-accent-blue">
      <div className="flex items-center gap-2 border-b border-border px-6 py-4">
        <span className="h-3 w-3 rounded-full bg-muted-foreground/30" />
        <span className="h-3 w-3 rounded-full bg-muted-foreground/30" />
        <span className="h-3 w-3 rounded-full bg-muted-foreground/30" />
        <span className="ml-3 font-mono text-xs text-muted-foreground">
          contact.sh
        </span>
      </div>
      <div
        ref={transcriptRef}
        onClick={() => inputRef.current?.focus()}
        className="h-[360px] w-full overflow-y-auto p-4 font-mono text-sm"
      >
        {lines.map((line, i) => (
          <p key={i} className={TONE_CLASS[line.tone]}>
            {line.tone === "input" ? "$ " : ""}
            {line.text}
          </p>
        ))}
        {!inputDisabled && (
          <form onSubmit={handleSubmit} className="flex items-center text-accent-blue">
            <span className="mr-2">$</span>
            <input
              ref={inputRef}
              type={step === "email" ? "email" : "text"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-label={
                step === "retry"
                  ? "Press Enter to retry"
                  : (PROMPTS[step as ContactField] ?? "Contact input")
              }
              className="flex-1 bg-transparent font-mono text-sm text-accent-blue caret-accent-blue outline-none"
            />
          </form>
        )}
      </div>
    </div>
  );
}
