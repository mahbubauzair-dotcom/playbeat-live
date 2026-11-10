"use client";

import { useEffect, useRef, useState } from "react";
import { Palette } from "lucide-react";
import { cn } from "@/lib/utils";

/* NEXA's 16 switchable accents — default violet */
export const ACCENTS: { key: string; color: string; label: string }[] = [
  { key: "violet", color: "#7e76c8", label: "Violet" },
  { key: "azure", color: "#4a90cd", label: "Azure" },
  { key: "sky", color: "#3ea2c4", label: "Sky" },
  { key: "teal", color: "#3aa0a8", label: "Teal" },
  { key: "jade", color: "#4aa480", label: "Jade" },
  { key: "lime", color: "#7ca65c", label: "Lime" },
  { key: "yellow", color: "#e8c83c", label: "Yellow" },
  { key: "amber", color: "#c4944c", label: "Amber" },
  { key: "ember", color: "#ca7458", label: "Ember" },
  { key: "red", color: "#e84848", label: "Red" },
  { key: "rose", color: "#c66a80", label: "Rose" },
  { key: "pink", color: "#ec5aa0", label: "Pink" },
  { key: "orchid", color: "#ba66a4", label: "Orchid" },
  { key: "plum", color: "#a06cb0", label: "Plum" },
  { key: "steel", color: "#7a8a9e", label: "Steel" },
  { key: "white", color: "#e2e4e9", label: "White" },
];

/**
 * NEXA-style accent switcher: 16 swatches, persisted in localStorage
 * ("pb-theme"), applied via <html data-theme=…> → --theme-c.
 */
export function AccentPicker({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("violet");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const t = localStorage.getItem("pb-theme");
      if (t) setCurrent(t);
    } catch {}
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  function pick(key: string) {
    setCurrent(key);
    try {
      localStorage.setItem("pb-theme", key);
    } catch {}
    document.documentElement.dataset.theme = key;
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Change accent colour"
        aria-expanded={open}
        className={cn(
          "grid place-items-center rounded-full text-zinc-400 transition-colors hover:bg-white/5 hover:text-white",
          compact ? "size-9" : "size-9"
        )}
      >
        <Palette className="size-4.5" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Accent colours"
          className="absolute right-0 top-11 z-[60] w-[248px] rounded-2xl border border-white/10 bg-surface-2/95 p-4 shadow-2xl shadow-black/60 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
        >
          <p className="mb-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Accent
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold normal-case tracking-normal text-white"
              style={{ background: "var(--theme-c)" }}
            >
              {ACCENTS.find((a) => a.key === current)?.label}
            </span>
          </p>
          <div className="grid grid-cols-8 gap-2">
            {ACCENTS.map((a) => (
              <button
                key={a.key}
                role="menuitemradio"
                aria-checked={a.key === current}
                aria-label={a.label}
                title={a.label}
                onClick={() => pick(a.key)}
                className={cn(
                  "size-6 rounded-full transition-transform hover:scale-110",
                  a.key === current && "ring-2 ring-white ring-offset-2 ring-offset-surface-2"
                )}
                style={{ background: a.color }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
