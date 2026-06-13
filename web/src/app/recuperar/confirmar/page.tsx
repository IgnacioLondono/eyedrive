"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AuthButton, AuthField, AuthInput, AuthMessage, AuthShell, SpamHint } from "@/components/auth/auth-shell";
import { authApi } from "@/lib/api";
import { applySessionFromResponse } from "@/lib/auth";

const RESET_KEY = "eyedrive.resetEmail";

export default function RecuperarConfirmarPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const e = sessionStorage.getItem(RESET_KEY);
    if (!e) router.replace("/recuperar");
    else setEmail(e);
  }, [router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    setMsg(null);
    try {
      const data = await authApi.passwordConfirm({
        email,
        code: String(fd.get("code") || "").trim(),
        newPassword: String(fd.get("newPassword") || ""),
        confirmPassword: String(fd.get("confirmPassword") || ""),
      });
      applySessionFromResponse(data);
      sessionStorage.removeItem(RESET_KEY);
      router.replace("/");
    } catch (err) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : "Error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Nueva contraseña" subtitle={`Código enviado a ${email}`} wide>
      <SpamHint />
      {msg && <AuthMessage type={msg.type === "error" ? "error" : "success"}>{msg.text}</AuthMessage>}
      <form className="space-y-4" onSubmit={onSubmit}>
        <AuthField label="Código"><AuthInput name="code" inputMode="numeric" maxLength={6} required className="text-center tracking-[0.3em]" /></AuthField>
        <AuthField label="Nueva contraseña"><AuthInput name="newPassword" type="password" required minLength={8} autoComplete="new-password" /></AuthField>
        <AuthField label="Confirmar contraseña"><AuthInput name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" /></AuthField>
        <AuthButton type="submit" disabled={loading}>{loading ? "Guardando…" : "Restablecer y entrar"}</AuthButton>
      </form>
      <p className="mt-4 text-center text-sm"><Link href="/recuperar" className="text-[var(--muted)] hover:underline">Volver</Link></p>
    </AuthShell>
  );
}
