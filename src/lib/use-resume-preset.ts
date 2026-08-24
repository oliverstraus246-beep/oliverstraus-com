"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_RESUME_PRESET,
  RESUME_PRESETS,
  type ResumePresetId,
} from "@/lib/resume-presets";

const STORAGE_KEY = "resume-preset";
const CHANGE_EVENT = "resume-preset-change";

function readStored(): ResumePresetId {
  if (typeof window === "undefined") return DEFAULT_RESUME_PRESET;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return RESUME_PRESETS.some((p) => p.id === stored)
    ? (stored as ResumePresetId)
    : DEFAULT_RESUME_PRESET;
}

/**
 * Shared across the résumé modal and the standalone /resume page -- each
 * mounts its own picker and its own ResumeContent, so selection syncs
 * through localStorage + a same-tab custom event (storage events don't
 * fire in the tab that made the change).
 */
export function useResumePreset() {
  const [preset, setPresetState] = useState<ResumePresetId>(DEFAULT_RESUME_PRESET);

  useEffect(() => {
    setPresetState(readStored());
    function onChange() {
      setPresetState(readStored());
    }
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  function setPreset(id: ResumePresetId) {
    window.localStorage.setItem(STORAGE_KEY, id);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return { preset, setPreset };
}
