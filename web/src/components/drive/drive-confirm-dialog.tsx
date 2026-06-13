"use client";

import { cn } from "@/lib/utils";
import { Trash2, X } from "lucide-react";
import { useEffect } from "react";

type Props = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function DriveConfirmDialog({
  title,
  message,
  confirmLabel = "Eliminar",
  cancelLabel = "Cancelar",
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [loading, onCancel]);

  return (
    <div
      className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      onClick={() => !loading && onCancel()}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="drive-confirm-title"
        aria-describedby="drive-confirm-message"
        className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start gap-3">
          {danger && (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
              <Trash2 className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h2 id="drive-confirm-title" className="text-lg font-semibold text-[var(--text)]">
                {title}
              </h2>
              <button
                type="button"
                className="rounded-full p-1 text-[var(--muted)] hover:text-[var(--text)]"
                aria-label="Cerrar"
                disabled={loading}
                onClick={onCancel}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p id="drive-confirm-message" className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              {message}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm transition hover:border-[var(--text)] disabled:opacity-50"
            disabled={loading}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50",
              danger
                ? "bg-red-500 hover:bg-red-600"
                : "bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)] hover:brightness-110"
            )}
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? "Eliminando…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
