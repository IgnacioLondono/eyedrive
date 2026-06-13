"use client";

import { cn } from "@/lib/utils";
import { useEffect, useLayoutEffect, useRef } from "react";

export type ContextMenuEntry =
  | { type: "separator" }
  | { label: string; action: () => void; danger?: boolean; disabled?: boolean };

type ContextMenuAction = Extract<ContextMenuEntry, { label: string }>;

type Props = {
  x: number;
  y: number;
  entries: ContextMenuEntry[];
  onClose: () => void;
};

export function DriveContextMenu({ x, y, entries, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (ref.current?.contains(e.target as Node)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onDismiss = () => onClose();
    const t = window.setTimeout(() => {
      document.addEventListener("mousedown", onMouseDown, true);
      document.addEventListener("keydown", onKey, true);
      window.addEventListener("scroll", onDismiss, true);
      window.addEventListener("resize", onDismiss);
    }, 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("mousedown", onMouseDown, true);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("scroll", onDismiss, true);
      window.removeEventListener("resize", onDismiss);
    };
  }, [onClose]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const pad = 8;
    const rect = el.getBoundingClientRect();
    let left = x;
    let top = y;
    if (left + rect.width > window.innerWidth - pad) left = window.innerWidth - rect.width - pad;
    if (top + rect.height > window.innerHeight - pad) top = window.innerHeight - rect.height - pad;
    if (left < pad) left = pad;
    if (top < pad) top = pad;
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }, [x, y, entries]);

  return (
    <div
      ref={ref}
      role="menu"
      className="fixed z-[10000] flex min-w-[12.5rem] max-w-[min(20rem,calc(100vw-1rem))] flex-col gap-0.5 rounded-xl border border-[var(--border)] bg-[var(--panel)]/95 p-1.5 shadow-2xl backdrop-blur-md"
      style={{ left: x, top: y }}
      onContextMenu={(e) => e.preventDefault()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {entries.map((entry, i) => {
        if ("type" in entry && entry.type === "separator") {
          return <div key={`sep-${i}`} role="separator" className="my-1 h-px bg-[var(--border)]" />;
        }
        const item = entry as ContextMenuAction;
        return (
          <button
            key={`${item.label}-${i}`}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              if (item.disabled) return;
              onClose();
              item.action();
            }}
            className={cn(
              "w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition hover:bg-[var(--panel-deep)] disabled:cursor-not-allowed disabled:opacity-45",
              item.danger ? "text-red-500" : "text-[var(--text)]"
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
