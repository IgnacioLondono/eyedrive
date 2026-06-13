"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AuthButton, AuthField, AuthInput, AuthMessage, AuthShell, SpamHint } from "@/components/auth/auth-shell";
import { authApi } from "@/lib/api";
import { authFetch } from "@/lib/auth";

const RESET_KEY = "eyedrive.resetEmail";

export default function RecuperarPage() {
  const router = useRouter();
  const [msg, setMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    authFetch("/api/auth/me").then((r) => { if (r.ok) router.replace("/"); });
  }, [router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") || "").trim();
    setLoading(true);
    setMsg(null);
    try {
      await authApi.passwordRequest(email);
      sessionStorage.setItem(RESET_KEY, email);
      router.push("/recuperar/confirmar");
    } catch (err) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : "Error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Recuperar contraseña" subtitle="Te enviaremos un código si la cuenta existe.">
      <SpamHint />
      {msg && <AuthMessage type="error">{msg.text}</AuthMessage>}
      <form className="space-y-4" onSubmit={onSubmit}>
        <AuthField label="Correo electrónico"><AuthInput name="email" type="email" required autoComplete="email" /></AuthField>
        <AuthButton type="submit" disabled={loading}>{loading ? "Enviando…" : "Enviar código"}</AuthButton>
      </form>
      <p className="mt-6 text-center text-sm"><Link href="/login" className="text-[var(--muted)] hover:underline">Volver al inicio de sesión</Link></p>
    </AuthShell>
  );
}
