"use client";

import { EyeBrand } from "@/components/eye-brand";
import { useTheme } from "@/components/providers/theme-provider";
import type { PathSegment, User } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  HardDrive,
  Menu,
  Moon,
  RefreshCw,
  Search,
  Sun,
  User as UserIcon,
  X,
} from "lucide-react";
import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";

type DriveShellProps = {
  user: User;
  path?: PathSegment[];
  onNavigate?: (segments: PathSegment[]) => void;
  search?: string;
  onSearchChange?: (value: string) => void;
  onRefresh?: () => void;
  onAreaContextMenu?: (e: React.MouseEvent, area: "breadcrumb" | "sidebar") => void;
  sidebar?: ReactNode | ((navigate: (segments: PathSegment[]) => void) => ReactNode);
  toolbar?: ReactNode;
  children: ReactNode;
  onLogout: () => void;
};

function Breadcrumbs({
  path,
  onNavigate,
  onContextMenu,
  className,
}: {
  path: PathSegment[];
  onNavigate?: (segments: PathSegment[]) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  className?: string;
}) {
  return (
    <nav className={cn("flex min-w-0 items-center gap-1 text-sm", className)} onContextMenu={onContextMenu}>
      <button
        type="button"
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 transition",
          path.length === 0 ? "bg-[var(--panel-deep)] font-semibold text-[var(--text)]" : "text-[var(--muted)] hover:text-[var(--text)]"
        )}
        onClick={() => onNavigate?.([])}
      >
        <HardDrive className="h-4 w-4" />
        <span className="max-sm:sr-only">Mi unidad</span>
      </button>
      {path.map((seg, i) => (
        <span key={seg.id} className="flex min-w-0 shrink-0 items-center gap-1">
          <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted)]" />
          <button
            type="button"
            className={cn(
              "max-w-[9rem] truncate rounded-lg px-2 py-1.5 sm:max-w-[12rem]",
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
  );
}

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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const initials = (user.displayName || user.email).slice(0, 2).toUpperCase();

  const closeSidebar = () => setSidebarOpen(false);

  const handleNavigate = (segments: PathSegment[]) => {
    closeSidebar();
    onNavigate?.(segments);
  };

  const sidebarContent = typeof sidebar === "function" ? sidebar(handleNavigate) : sidebar;

  useEffect(() => {
    if (!sidebarOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sidebarOpen]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const headerActions = (
    <>
      {onSearchChange && (
        <div className="relative hidden lg:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar en esta carpeta…"
            className="w-52 rounded-full border border-[var(--border)] bg-[var(--panel-deep)] py-2 pl-9 pr-4 text-sm outline-none transition focus:border-[var(--accent)] xl:w-64"
          />
        </div>
      )}
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-full border border-[var(--border)] p-2 text-[var(--muted)] transition hover:border-[var(--text)] hover:text-[var(--text)] sm:p-2.5"
          aria-label="Actualizar"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      )}
      <button
        type="button"
        onClick={toggleTheme}
        className="rounded-full border border-[var(--border)] p-2 text-[var(--muted)] transition hover:border-[var(--text)] hover:text-[var(--text)] sm:p-2.5"
        aria-label="Cambiar tema"
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
      <div className="relative">
        <button
          type="button"
          onClick={() => setUserMenuOpen((v) => !v)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand-from)] to-[var(--brand-to)] text-[10px] font-bold text-white shadow-sm sm:h-9 sm:w-9 sm:text-xs"
        >
          {initials}
        </button>
        {userMenuOpen && (
          <>
            <button type="button" className="fixed inset-0 z-40" aria-label="Cerrar menú" onClick={() => setUserMenuOpen(false)} />
            <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] py-1 shadow-2xl">
              <p className="truncate px-4 py-2 text-xs text-[var(--muted)]">{user.email}</p>
              <Link
                href="/cuenta"
                className="flex items-center gap-2 px-4 py-2.5 text-sm transition hover:bg-[var(--panel-deep)]"
                onClick={() => setUserMenuOpen(false)}
              >
                <UserIcon className="h-4 w-4" /> Mi cuenta
              </Link>
              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(false);
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
    </>
  );

  return (
    <div className="flex min-h-[100dvh] bg-[var(--bg)]">
        {sidebarOpen && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/55 lg:hidden"
            aria-label="Cerrar menú lateral"
            onClick={closeSidebar}
          />
        )}

        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-[min(18rem,88vw)] flex-col bg-[var(--sidebar)] text-[var(--sidebar-text)] shadow-2xl transition-transform duration-200 ease-out lg:static lg:z-auto lg:w-[17.5rem] lg:shrink-0 lg:translate-x-0 lg:shadow-[inset_-1px_0_0_rgba(255,255,255,0.06)]",
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}
        >
          <div className="flex items-center gap-3 border-b border-white/8 px-4 py-3 lg:px-5 lg:py-4">
            <EyeBrand size={36} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold tracking-tight">Eyedrive</p>
              <p className="text-[11px] text-zinc-500">Tu nube personal</p>
            </div>
            <button
              type="button"
              className="rounded-lg p-1.5 text-zinc-400 hover:text-white lg:hidden"
              aria-label="Cerrar menú"
              onClick={closeSidebar}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav
            className="flex-1 overflow-y-auto overscroll-contain px-3 py-4"
            onContextMenu={(e) => {
              if ((e.target as HTMLElement).closest("input, textarea")) return;
              onAreaContextMenu?.(e, "sidebar");
            }}
          >
            {sidebarContent}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--panel)]/95 backdrop-blur-md">
            <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4 lg:hidden">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text)]"
                aria-label="Abrir menú"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <EyeBrand size={28} />
                <span className="truncate text-sm font-bold">Eyedrive</span>
              </div>
              <div className="flex shrink-0 items-center gap-1">{headerActions}</div>
            </div>

            <div className="hidden items-center gap-3 px-6 py-3 lg:flex">
              <Breadcrumbs
                path={path}
                onNavigate={handleNavigate}
                onContextMenu={(e) => onAreaContextMenu?.(e, "breadcrumb")}
                className="flex-1"
              />
              <div className="flex items-center gap-2">{headerActions}</div>
            </div>

            <div className="overflow-x-auto border-b border-[var(--border)] px-3 py-2 lg:hidden">
              <Breadcrumbs
                path={path}
                onNavigate={handleNavigate}
                onContextMenu={(e) => onAreaContextMenu?.(e, "breadcrumb")}
              />
            </div>

            {onSearchChange && (
              <div className="border-b border-[var(--border)] px-3 py-2 lg:hidden">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                  <input
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Buscar en esta carpeta…"
                    className="w-full rounded-full border border-[var(--border)] bg-[var(--panel-deep)] py-2 pl-9 pr-4 text-sm outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>
            )}

            {toolbar && (
              <div className="flex items-center gap-2 overflow-x-auto border-t border-[var(--border)] px-3 py-2 sm:px-4 lg:flex-wrap lg:px-6 lg:py-3 [&>*]:shrink-0">
                {toolbar}
              </div>
            )}
          </header>
          {children}
        </div>
    </div>
  );
}
