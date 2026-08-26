"use client";

import { useSyncExternalStore } from "react";
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
 *
 * Implemented with useSyncExternalStore rather than a useState + effect
 * that calls setState on mount (which the react-hooks/set-state-in-effect
 * rule flags, and rightly -- it's the "sync from an external store on
 * mount" anti-pattern). useSyncExternalStore is built for this: subscribe
 * to the change events, snapshot reads localStorage, and the server
 * snapshot returns the default so hydration matches and the real value
 * is picked up cleanly post-hydration. The snapshot returns a primitive
 * string, so Object.is keeps it stable across renders (no re-render loop).
 */
function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function useResumePreset() {
  const preset = useSyncExternalStore(
    subscribe,
    readStored,
    () => DEFAULT_RESUME_PRESET,
  );

  function setPreset(id: ResumePresetId) {
    window.localStorage.setItem(STORAGE_KEY, id);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return { preset, setPreset };
}