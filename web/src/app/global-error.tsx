"use client";

import { EyeBrand } from "@/components/eye-brand";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center text-white">
        <EyeBrand size={48} />
        <h1 className="mt-6 text-xl font-semibold">Esta página no pudo cargarse</h1>
        <p className="mt-2 text-sm text-zinc-400">Recarga para intentarlo de nuevo.</p>
        <button type="button" onClick={reset} className="mt-6 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black">
          Recargar
        </button>
      </body>
    </html>
  );
}
