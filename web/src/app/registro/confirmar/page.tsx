"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AuthButton, AuthField, AuthInput, AuthMessage, AuthShell, SpamHint } from "@/components/auth/auth-shell";
import { authApi } from "@/lib/api";
import { applySessionFromResponse } from "@/lib/auth";

const PENDING_KEY = "eyedrive.pendingEmail";

export default function RegistroConfirmarPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const e = sessionStorage.getItem(PENDING_KEY);
    if (!e) router.replace("/registro");
    else setEmail(e);
  }, [router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code") || "").trim();
    setLoading(true);
    setMsg(null);
    try {
      const data = await authApi.registerConfirm(email, code);
      applySessionFromResponse(data);
      sessionStorage.removeItem(PENDING_KEY);
      router.replace("/");
    } catch (err) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : "Error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Confirmar correo" subtitle={`Introduce el código enviado a ${email}`}>
      <SpamHint />
      {msg && <AuthMessage type={msg.type === "error" ? "error" : "success"}>{msg.text}</AuthMessage>}
      <form className="space-y-4" onSubmit={onSubmit}>
        <AuthField label="Código de 6 dígitos">
          <AuthInput name="code" inputMode="numeric" maxLength={6} required className="text-center text-lg tracking-[0.3em]" />
        </AuthField>
        <AuthButton type="submit" disabled={loading}>{loading ? "Verificando…" : "Confirmar y entrar"}</AuthButton>
        <button
          type="button"
          className="w-full text-sm text-[var(--muted)] hover:text-[var(--text)]"
          onClick={async () => {
            try {
              await authApi.registerResend(email);
              setMsg({ type: "success", text: "Código reenviado." });
            } catch (err) {
              setMsg({ type: "error", text: err instanceof Error ? err.message : "Error" });
            }
          }}
        >
          Reenviar código
        </button>
      </form>
      <p className="mt-4 text-center text-sm"><Link href="/registro" className="text-[var(--muted)] hover:underline">Volver al registro</Link></p>
    </AuthShell>
  );
}
