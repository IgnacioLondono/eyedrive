"use client";

import { EyeBrand } from "@/components/eye-brand";
import { useTheme } from "@/components/providers/theme-provider";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChevronRight, HardDrive, Moon, RefreshCw, Search, Sun, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import type { PathSegment } from "@/lib/types";

type DriveShellProps = {
  user: User;
  path?: PathSegment[];
  onNavigate?: (segments: PathSegment[]) => void;
  search?: string;
  onSearchChange?: (value: string) => void;
  onRefresh?: () => void;
  onAreaContextMenu?: (e: React.MouseEvent, area: "breadcrumb" | "sidebar") => void;
  sidebar?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  onLogout: () => void;
};

export function DriveShell({
  user,
  path = [],
  onNavigate,
  search = "",
  onSearchChange,
  onRefresh,
  onAreaContextMenu,
  sidebar,
  toolbar,
  children,
  onLogout,
}: DriveShellProps) {
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = (user.displayName || user.email).slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      <aside className="flex w-[17.5rem] shrink-0 flex-col bg-[var(--sidebar)] text-[var(--sidebar-text)] shadow-[inset_-1px_0_0_rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-3 border-b border-white/8 px-5 py-4">
          <EyeBrand size={38} />
          <div>
            <p className="text-base font-bold tracking-tight">Eyedrive</p>
            <p className="text-[11px] text-zinc-500">Tu nube personal</p>
          </div>
        </div>
        <nav
          className="flex-1 overflow-y-auto px-3 py-4"
          onContextMenu={(e) => {
            if ((e.target as HTMLElement).closest("input, textarea")) return;
            onAreaContextMenu?.(e, "sidebar");
          }}
        >
          {sidebar}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--panel)]/95 backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-3 px-6 py-3">
            <nav
              className="flex min-w-0 flex-wrap items-center gap-1 text-sm"
              onContextMenu={(e) => onAreaContextMenu?.(e, "breadcrumb")}
            >
              <button
                type="button"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition",
                  path.length === 0 ? "bg-[var(--panel-deep)] font-semibold text-[var(--text)]" : "text-[var(--muted)] hover:text-[var(--text)]"
                )}
                onClick={() => onNavigate?.([])}
              >
                <HardDrive className="h-4 w-4" />
                Mi unidad
              </button>
              {path.map((seg, i) => (
                <span key={seg.id} className="flex min-w-0 items-center gap-1">
                  <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                  <button
                    type="button"
                    className={cn(
                      "max-w-[12rem] truncate rounded-lg px-2.5 py-1.5 transition",
                      i === path.length - 1
                        ? "bg-[var(--panel-deep)] font-semibold text-[var(--text)]"
                        : "text-[var(--muted)] hover:text-[var(--text)]"
                    )}
                    onClick={() => onNavigate?.(path.slice(0, i + 1))}
                  >
                    {seg.name}
                  </button>
                </span>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-2">
              {onSearchChange && (
                <div className="relative hidden sm:block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                  <input
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Buscar en esta carpeta…"
                    className="w-64 rounded-full border border-[var(--border)] bg-[var(--panel-deep)] py-2 pl-9 pr-4 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_20%,transparent)]"
                  />
                </div>
              )}
              {onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  className="rounded-full border border-[var(--border)] p-2.5 text-[var(--muted)] transition hover:border-[var(--text)] hover:text-[var(--text)]"
                  aria-label="Actualizar"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={toggleTheme}
                className="rounded-full border border-[var(--border)] p-2.5 text-[var(--muted)] transition hover:border-[var(--text)] hover:text-[var(--text)]"
                aria-label="Cambiar tema"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand-from)] to-[var(--brand-to)] text-xs font-bold text-white shadow-sm"
                >
                  {initials}
                </button>
                {menuOpen && (
                  <>
                    <button type="button" className="fixed inset-0 z-40" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] py-1 shadow-2xl">
                      <p className="truncate px-4 py-2 text-xs text-[var(--muted)]">{user.email}</p>
                      <Link
                        href="/cuenta"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm transition hover:bg-[var(--panel-deep)]"
                        onClick={() => setMenuOpen(false)}
                      >
                        <UserIcon className="h-4 w-4" /> Mi cuenta
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm transition hover:bg-[var(--panel-deep)]"
                      >
                        Cerrar sesión
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          {toolbar && <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] px-6 py-3">{toolbar}</div>}
        </header>
        {children}
      </div>
    </div>
  );
}
