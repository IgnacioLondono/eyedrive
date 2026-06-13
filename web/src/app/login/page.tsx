"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import {
  AuthButton,
  AuthField,
  AuthInput,
  AuthMessage,
  AuthShell,
  SpamHint,
} from "@/components/auth/auth-shell";
import { authApi } from "@/lib/api";
import { applySessionFromResponse, authFetch } from "@/lib/auth";

const LOGIN_EMAIL_KEY = "eyedrive.loginEmail";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState<"credentials" | "code">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [msg, setMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    authFetch("/api/auth/me").then((r) => {
      if (r.ok) router.replace("/");
    });
    const stored = sessionStorage.getItem(LOGIN_EMAIL_KEY) || "";
    if (params.get("step") === "code" && stored) {
      setPendingEmail(stored);
      setStep("code");
    }
  }, [router, params]);

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const data = await authApi.login(email.trim(), password);
      if (data.sessionToken) {
        applySessionFromResponse(data);
        sessionStorage.removeItem(LOGIN_EMAIL_KEY);
        router.replace("/");
        return;
      }
      if (!data.needsCode) throw new Error("No se pudo completar el inicio de sesión");
      const em = data.email || email.trim();
      setPendingEmail(em);
      sessionStorage.setItem(LOGIN_EMAIL_KEY, em);
      setStep("code");
      setMsg({ type: "success", text: data.message || "Te hemos enviado un código a tu correo." });
    } catch (err) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : "Error" });
    } finally {
      setLoading(false);
    }
  }

  async function onConfirm(e: FormEvent) {
    e.preventDefault();
    if (!pendingEmail) {
      setStep("credentials");
      setMsg({ type: "error", text: "Vuelve a introducir tu correo y contraseña." });
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      const data = await authApi.loginConfirm(pendingEmail, code.trim());
      applySessionFromResponse(data);
      sessionStorage.removeItem(LOGIN_EMAIL_KEY);
      router.replace("/");
    } catch (err) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : "Error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title={step === "code" ? "Código de acceso" : "Iniciar sesión"}
      subtitle={step === "code" ? `Revisa tu correo: ${pendingEmail}` : "Accede a tu nube personal"}
    >
      {msg && <AuthMessage type={msg.type === "error" ? "error" : "success"}>{msg.text}</AuthMessage>}
      {step === "credentials" ? (
        <form className="space-y-4" onSubmit={onLogin}>
          <AuthField label="Correo electrónico">
            <AuthInput type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </AuthField>
          <AuthField label="Contraseña">
            <AuthInput type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </AuthField>
          <AuthButton type="submit" disabled={loading}>{loading ? "Entrando…" : "Entrar"}</AuthButton>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={onConfirm}>
          <SpamHint />
          <AuthField label="Código de 6 dígitos">
            <AuthInput inputMode="numeric" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value)} className="text-center text-lg tracking-[0.3em]" />
          </AuthField>
          <AuthButton type="submit" disabled={loading}>{loading ? "Entrando…" : "Confirmar"}</AuthButton>
          <div className="flex gap-3 text-sm">
            <button type="button" className="text-[var(--muted)] hover:text-[var(--text)]" onClick={() => { setStep("credentials"); sessionStorage.removeItem(LOGIN_EMAIL_KEY); }}>
              Volver
            </button>
            <button
              type="button"
              className="text-[var(--text)] hover:underline"
              onClick={async () => {
                try {
                  await authApi.loginResend(pendingEmail);
                  setMsg({ type: "success", text: "Te hemos enviado un código nuevo." });
                } catch (err) {
                  setMsg({ type: "error", text: err instanceof Error ? err.message : "Error" });
                }
              }}
            >
              Reenviar código
            </button>
          </div>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-[var(--muted)]">
        ¿No tienes cuenta? <Link href="/registro" className="font-medium text-[var(--text)] hover:underline">Crear cuenta</Link>
      </p>
      <p className="mt-2 text-center text-sm">
        <Link href="/recuperar" className="text-[var(--muted)] hover:text-[var(--text)]">¿Olvidaste tu contraseña?</Link>
      </p>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-[var(--muted)]">Cargando…</div>}>
      <LoginForm />
    </Suspense>
  );
}
