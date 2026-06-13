"use client";

import { EyeBrand } from "@/components/eye-brand";
import Link from "next/link";

export default function CuentaError({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg)] px-6 text-center">
      <EyeBrand size={48} />
      <h1 className="mt-6 text-xl font-semibold">No se pudo cargar tu cuenta</h1>
      <p className="mt-2 max-w-sm text-sm text-[var(--muted)]">Hubo un error al mostrar esta página. Puedes reintentar o volver a tu unidad.</p>
      <div className="mt-6 flex gap-3">
        <button type="button" onClick={reset} className="rounded-xl bg-[var(--text)] px-4 py-2 text-sm font-medium text-[var(--bg)]">
          Reintentar
        </button>
        <Link href="/" className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm">
          Mi unidad
        </Link>
      </div>
    </div>
  );
}
