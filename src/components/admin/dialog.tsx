"use client";

import { useEffect, useRef, type ReactNode } from "react";

type DialogProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
};

export function Dialog({ open, title, onClose, children, wide = false }: DialogProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>("input, select, textarea, button")?.focus();
    }, 60);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
      window.clearTimeout(timer);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="關閉對話框" onClick={onClose} className="absolute inset-0 cursor-default bg-cocoa/40 animate-fade-in" />
      <div
        ref={panelRef}
        className={`relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-cream shadow-2xl sm:rounded-2xl ${wide ? "sm:max-w-3xl" : "sm:max-w-xl"}`}
        style={{ animation: "wy-sheet-up 260ms cubic-bezier(0.22, 0.61, 0.36, 1) both" }}
      >
        <div className="flex items-center justify-between border-b border-mist/70 px-6 py-4">
          <h2 className="text-xl">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-full border border-mist p-1.5 text-cocoa hover:border-caramel" aria-label="關閉">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (value: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${checked ? "bg-caramel" : "bg-mist"}`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-cream shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

export async function apiRequest<T = Record<string, unknown>>(url: string, init: RequestInit): Promise<{ ok: boolean; status: number; data: T & { error?: string; message?: string } }> {
  try {
    const response = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
    const data = (await response.json().catch(() => ({}))) as T & { error?: string; message?: string };
    return { ok: response.ok && (data as { ok?: boolean }).ok !== false, status: response.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: "網路或伺服器發生問題，請稍後再試。" } as T & { error?: string } };
  }
}
