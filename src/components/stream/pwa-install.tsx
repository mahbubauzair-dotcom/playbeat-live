"use client";

/*
 * PWA installation for Playbeat Live.
 *
 * - Captures the Chromium `beforeinstallprompt` event once and shares it
 *   between every Install-App button via a tiny external store.
 * - Always stays visible so users know an app is available.
 * - When clicked on Chromium, triggers the native install dialog.
 * - On iOS Safari, opens a styled "Share -> Add to Home Screen" guide.
 * - On Desktop, guides user to the browser install icon in address bar.
 * - When already running as standalone app, hides automatically.
 */

import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Download, Share, SquarePlus, Check, X, MonitorSmartphone, Smartphone } from "lucide-react";

/* ------------------------------ install store ----------------------------- */

type InstallState = "idle" | "unsupported" | "promptable" | "ios" | "installed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let state: InstallState = "idle";
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function isStandalone(): boolean {
  return (
    (typeof matchMedia === "function" &&
      matchMedia("(display-mode: standalone)").matches) ||
    (typeof matchMedia === "function" &&
      matchMedia("(display-mode: minimal-ui)").matches) ||
    (typeof navigator !== "undefined" &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iosUa = /iphone|ipad|ipod/i.test(ua);
  const ipadOs = /macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
  return iosUa || ipadOs;
}

function detect(): InstallState {
  if (typeof window === "undefined") return "idle";
  if (isStandalone()) return "installed";
  if (deferredPrompt) return "promptable";
  if (isIos()) return "ios";
  return "idle";
}

function subscribe(cb: () => void): () => void {
  if (listeners.size === 0 && typeof window !== "undefined") {
    state = detect();

    window.addEventListener("beforeinstallprompt", (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      if (!isStandalone()) {
        state = "promptable";
        emit();
      }
    });

    window.addEventListener("appinstalled", () => {
      deferredPrompt = null;
      state = "installed";
      emit();
    });

    const mq = matchMedia("(display-mode: standalone)");
    const onModeChange = () => {
      const next = detect();
      if (next !== state) {
        state = next;
        emit();
      }
    };
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onModeChange);
    }
  }

  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): InstallState {
  return state;
}

function getServerSnapshot(): InstallState {
  return "idle";
}

export function useInstall() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        deferredPrompt = null;
        state = "installed";
        emit();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  return { state: current, promptInstall };
}

/* -------------------------------- PwaInstaller ---------------------------- */

export function PwaInstaller() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.debug("SW registration ignored:", err));
  }, []);

  return null;
}

/* ----------------------------- InstallAppButton --------------------------- */

const GOLD_BTN =
  "inline-flex h-9 items-center gap-1.5 rounded-full bg-gradient-to-r from-[var(--theme-c)] to-[var(--site-lo)] font-bold text-[var(--site-on-accent)] shadow-[0_0_16px_var(--theme-glow)] ring-1 ring-[var(--theme-c)]/50 transition-all duration-200 hover:shadow-[0_0_24px_var(--theme-glow)] hover:brightness-110 active:scale-95";

export function InstallAppButton({ variant }: { variant: "header" | "footer" }) {
  const { state, promptInstall } = useInstall();
  const [iosOpen, setIosOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(false);

  // Hide only if already running inside the installed standalone app
  if (state === "installed") return null;

  const onClick = () => {
    if (state === "promptable") {
      void promptInstall();
    } else if (state === "ios") {
      setIosOpen(true);
    } else if (deferredPrompt) {
      void promptInstall();
    } else {
      setDesktopOpen(true);
    }
  };

  if (variant === "header") {
    return (
      <>
        <button
          type="button"
          onClick={onClick}
          aria-label="Install Playbeat Live app"
          title="Install Playbeat Live App on your phone or PC"
          className={cn(GOLD_BTN, "px-3.5 sm:px-4 text-xs")}
        >
          <Download className="size-4" strokeWidth={2.5} />
          <span className="hidden font-extrabold sm:inline">Install App</span>
        </button>
        <IosInstallSheet open={iosOpen} onClose={() => setIosOpen(false)} />
        <DesktopInstallModal open={desktopOpen} onClose={() => setDesktopOpen(false)} />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        aria-label="Install Playbeat Live app"
        className={cn(GOLD_BTN, "px-4 py-2 text-xs")}
      >
        <Download className="size-3.5" strokeWidth={2.5} /> Install App
      </button>
      <IosInstallSheet open={iosOpen} onClose={() => setIosOpen(false)} />
      <DesktopInstallModal open={desktopOpen} onClose={() => setDesktopOpen(false)} />
    </>
  );
}

/* ---------------------------- iOS instruction sheet ----------------------- */

function IosInstallSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-3xl border border-[var(--theme-c)]/40 bg-[#0c1626] p-6 shadow-2xl text-zinc-100">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Smartphone className="size-5 text-[var(--theme-c)]" />
            <h3 className="text-sm font-bold text-white">Install on iPhone / iPad</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-white">
            <X className="size-4" />
          </button>
        </div>

        <ol className="mt-4 space-y-3 text-xs text-slate-300">
          <li className="flex items-center gap-2.5">
            <span className="flex size-6 items-center justify-center rounded-full bg-[var(--theme-c)]/20 font-bold text-[var(--theme-c)]">1</span>
            <span>Safari browser mein bottom bar par <strong>Share</strong> icon tap karein.</span>
          </li>
          <li className="flex items-center gap-2.5">
            <span className="flex size-6 items-center justify-center rounded-full bg-[var(--theme-c)]/20 font-bold text-[var(--theme-c)]">2</span>
            <span>List ko scroll kar ke <strong>Add to Home Screen</strong> select karein.</span>
          </li>
          <li className="flex items-center gap-2.5">
            <span className="flex size-6 items-center justify-center rounded-full bg-[var(--theme-c)]/20 font-bold text-[var(--theme-c)]">3</span>
            <span>Top-right par <strong>Add</strong> tap karein. App install ho jayegi!</span>
          </li>
        </ol>

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-[var(--theme-c)] py-2.5 text-xs font-bold text-[var(--site-on-accent)]"
        >
          Got it
        </button>
      </div>
    </div>,
    document.body
  );
}

/* ----------------------- Desktop / Chrome Instruction Modal ----------------- */

function DesktopInstallModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl border border-[var(--theme-c)]/40 bg-[#0c1626] p-6 shadow-2xl text-zinc-100">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <MonitorSmartphone className="size-5 text-[var(--theme-c)]" />
            <h3 className="text-sm font-bold text-white">Install Playbeat Live App</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-white">
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3 text-xs leading-relaxed text-slate-300">
          <p>Playbeat Live ko aap apne computer ya mobile phone par ek real standalone app ki tarah chala sakte hain:</p>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
            <p className="font-semibold text-white">Chrome / Edge Browser Mein:</p>
            <p>Browser ke top address bar mein URL ke sath right side par <strong>Install (⊕ / Computer icon)</strong> nazar aayega. Us par click kar ke <strong>Install</strong> kar dein!</p>
          </div>
          <p className="text-[11px] text-slate-400">Mobile par open karne par yeh direct one-tap install ho jati hai.</p>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-gradient-to-r from-[var(--theme-c)] to-[var(--site-lo)] py-2.5 text-xs font-bold text-[var(--site-on-accent)]"
        >
          Done
        </button>
      </div>
    </div>,
    document.body
  );
}
