"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AuthButton, AuthField, AuthInput, AuthMessage, AuthShell, SpamHint } from "@/components/auth/auth-shell";
import { authApi } from "@/lib/api";
import { authFetch } from "@/lib/auth";

const PENDING_KEY = "eyedrive.pendingEmail";

export default function RegistroPage() {
  const router = useRouter();
  const [msg, setMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    authFetch("/api/auth/me").then((r) => { if (r.ok) router.replace("/"); });
  }, [router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const displayName = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const password = String(fd.get("password") || "");
    const confirmPassword = String(fd.get("confirmPassword") || "");
    setLoading(true);
    setMsg(null);
    try {
      await authApi.registerRequest({ displayName, email, password, confirmPassword });
      sessionStorage.setItem(PENDING_KEY, email);
      router.push("/registro/confirmar");
    } catch (err) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : "Error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Crear cuenta" subtitle="Después te enviaremos un código a tu correo." wide>
      <SpamHint />
      {msg && <AuthMessage type="error">{msg.text}</AuthMessage>}
      <form className="space-y-4" onSubmit={onSubmit}>
        <AuthField label="Nombre"><AuthInput name="name" required maxLength={80} autoComplete="name" /></AuthField>
        <AuthField label="Correo electrónico"><AuthInput name="email" type="email" required autoComplete="email" /></AuthField>
        <AuthField label="Contraseña"><AuthInput name="password" type="password" required minLength={8} autoComplete="new-password" /></AuthField>
        <AuthField label="Confirmar contraseña"><AuthInput name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" /></AuthField>
        <AuthButton type="submit" disabled={loading}>{loading ? "Enviando…" : "Continuar y verificar correo"}</AuthButton>
      </form>
      <p className="mt-6 text-center text-sm text-[var(--muted)]">
        ¿Ya tienes cuenta? <Link href="/login" className="font-medium text-[var(--text)] hover:underline">Iniciar sesión</Link>
      </p>
    </AuthShell>
  );
}
