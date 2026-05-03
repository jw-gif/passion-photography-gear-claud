import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Debounced auto-save. Calls `save(value)` ~`delay`ms after `value` stops
 * changing. Skips the first run (initial load). Returns a status string
 * suitable for a small "Saving… / Saved" indicator.
 */
export function useAutoSave<T>(
  value: T,
  save: (v: T) => Promise<void>,
  delay = 600,
): SaveState {
  const [state, setState] = useState<SaveState>("idle");
  const first = useRef(true);
  const latest = useRef(value);
  const inFlight = useRef(false);
  const pending = useRef(false);

  useEffect(() => {
    latest.current = value;
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(async () => {
      if (inFlight.current) {
        pending.current = true;
        return;
      }
      inFlight.current = true;
      setState("saving");
      try {
        await save(latest.current);
        // If value changed during save, save again
        if (pending.current) {
          pending.current = false;
          await save(latest.current);
        }
        setState("saved");
        setTimeout(() => setState((s) => (s === "saved" ? "idle" : s)), 1500);
      } catch (err) {
        setState("error");
        const msg = err instanceof Error ? err.message : "Save failed";
        toast.error(msg, {
          action: {
            label: "Retry",
            onClick: () => {
              save(latest.current).then(
                () => setState("saved"),
                () => setState("error"),
              );
            },
          },
        });
      } finally {
        inFlight.current = false;
      }
    }, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return state;
}

export function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  const text =
    state === "saving"
      ? "Saving…"
      : state === "saved"
        ? "Saved"
        : "Save failed";
  const cls =
    state === "error"
      ? "text-destructive"
      : state === "saved"
        ? "text-emerald-600"
        : "text-muted-foreground";
  return <span className={`text-xs ${cls}`}>{text}</span>;
}
