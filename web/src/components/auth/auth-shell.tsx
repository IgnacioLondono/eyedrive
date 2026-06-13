"use client";

import Link from "next/link";
import { EyeBrand } from "@/components/eye-brand";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  wide?: boolean;
};

export function AuthShell({ title, subtitle, children, wide }: Props) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-6">
      <div
        className={cn(
          "w-full rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-8 shadow-xl shadow-black/5",
          wide ? "max-w-lg" : "max-w-md"
        )}
      >
        <div className="mb-6 flex items-center gap-3">
          <EyeBrand closeOnPassword />
          <div>
            <Link href="/" className="text-xl font-bold tracking-tight text-[var(--text)]">
              Eyedrive
            </Link>
          </div>
        </div>
        <h1 className="mb-1 text-lg font-semibold text-[var(--text)]">{title}</h1>
        {subtitle ? <p className="mb-6 text-sm text-[var(--muted)]">{subtitle}</p> : <div className="mb-6" />}
        {children}
      </div>
    </div>
  );
}

export function AuthMessage({ type, children }: { type: "error" | "success" | "info"; children: React.ReactNode }) {
  const styles = {
    error: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    info: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  };
  return (
    <div className={cn("mb-4 rounded-xl border px-3 py-2 text-sm", styles[type])} role="alert">
      {children}
    </div>
  );
}

export function AuthField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[var(--text)]">{label}</span>
      {children}
    </label>
  );
}

export function AuthInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-xl border border-[var(--border)] bg-[var(--panel-deep)] px-3 py-2.5 text-sm text-[var(--text)] outline-none transition focus:border-[var(--text)] focus:ring-2 focus:ring-[var(--text)]/10",
        props.className
      )}
    />
  );
}

export function AuthButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "w-full rounded-xl bg-[var(--text)] px-4 py-2.5 text-sm font-semibold text-[var(--bg)] transition hover:opacity-90 disabled:opacity-50",
        props.className
      )}
    />
  );
}

export function AuthLink(props: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} className={cn("font-medium text-[var(--text)] underline-offset-2 hover:underline", props.className)} />;
}

export function SpamHint() {
  return (
    <p className="mb-4 text-sm text-[var(--muted)]" role="note">
      Si no recibes el correo en unos minutos, revisa la carpeta de <strong>spam</strong> o correo no deseado.
    </p>
  );
}
