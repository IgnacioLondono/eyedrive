"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { EyeBrand } from "@/components/eye-brand";
import { useTheme } from "@/components/providers/theme-provider";
import { authApi, fetchMe } from "@/lib/api";
import { clearSessionToken } from "@/lib/auth";
import type { TrustedDevice, User } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { ArrowLeft, HardDrive, Moon, Shield, Sun, User as UserIcon } from "lucide-react";

export default function CuentaPage() {
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [msg, setMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    fetchMe()
      .then((u) => setUser(u))
      .catch(() => setUser(null));
    authApi.listDevices().then(setDevices).catch(() => {});
  }, []);

  async function logout() {
    await authApi.logout();
    clearSessionToken();
    window.location.href = "/login";
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--panel)]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-4">
          <EyeBrand size={36} />
          <span className="text-lg font-bold">Eyedrive</span>
          <Link href="/" className="ml-2 flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] transition hover:text-[var(--text)]">
            <HardDrive className="h-4 w-4" /> Mi unidad
          </Link>
          <button type="button" onClick={toggleTheme} className="ml-auto rounded-full border border-[var(--border)] p-2.5 text-[var(--muted)] hover:text-[var(--text)]">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <Link href="/" className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--text)]">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
        <h1 className="mb-2 text-3xl font-bold tracking-tight">Mi cuenta</h1>
        <p className="mb-8 text-[var(--muted)]">{user.email}</p>

        {msg && (
          <div className={cn("mb-6 rounded-2xl border px-4 py-3 text-sm", msg.type === "error" ? "border-red-500/30 text-red-500" : "border-emerald-500/30 text-emerald-600")}>
            {msg.text}
          </div>
        )}

        <div className="space-y-6">
          <Section icon={UserIcon} title="Perfil">
            <form
              className="space-y-4"
              onSubmit={async (e: FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                const displayName = String(new FormData(e.currentTarget).get("displayName") || "").trim();
                try {
                  const res = await authApi.updateProfile(displayName);
                  if (!res.ok) throw new Error("Error");
                  setUser({ ...user, displayName });
                  setMsg({ type: "success", text: "Perfil actualizado." });
                } catch {
                  setMsg({ type: "error", text: "No se pudo guardar." });
                }
              }}
            >
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium">Nombre visible</span>
                <input name="displayName" defaultValue={user.displayName} className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-deep)] px-4 py-2.5 outline-none focus:border-[var(--accent)]" />
              </label>
              <button type="submit" className="rounded-xl bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)] px-4 py-2 text-sm font-semibold text-white">
                Guardar cambios
              </button>
            </form>
          </Section>

          <Section icon={Shield} title="Seguridad">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                defaultChecked={user.loginCodeEnabled}
                onChange={async (e) => {
                  try {
                    const res = await authApi.updateSecurity(e.target.checked);
                    if (!res.ok) throw new Error("Error");
                    setUser({ ...user, loginCodeEnabled: e.target.checked });
                    setMsg({ type: "success", text: e.target.checked ? "Código activado." : "Código desactivado." });
                  } catch {
                    setMsg({ type: "error", text: "No se pudo guardar." });
                  }
                }}
              />
              <span>
                <span className="font-medium">Código por correo</span>
                <span className="mt-0.5 block text-[var(--muted)]">Pedir código al iniciar sesión en navegadores nuevos</span>
              </span>
            </label>

            <div className="mt-6 border-t border-[var(--border)] pt-6">
              <h3 className="mb-3 text-sm font-medium">Navegadores de confianza</h3>
              <ul className="mb-3 space-y-2 text-sm">
                {devices.map((d) => (
                  <li key={d.id} className="rounded-xl border border-[var(--border)] bg-[var(--panel-deep)] px-3 py-2">
                    {d.label} · hasta {formatDate(d.expiresAt)}
                  </li>
                ))}
                {!devices.length && <li className="text-[var(--muted)]">Ninguno registrado</li>}
              </ul>
              <button
                type="button"
                className="text-sm text-[var(--muted)] hover:text-[var(--text)]"
                onClick={async () => {
                  await authApi.revokeAllDevices();
                  setDevices([]);
                  setMsg({ type: "success", text: "Navegadores eliminados." });
                }}
              >
                Quitar todos
              </button>
            </div>

            <form
              className="mt-6 space-y-3 border-t border-[var(--border)] pt-6"
              onSubmit={async (e: FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                try {
                  const res = await authApi.updatePassword({
                    currentPassword: String(fd.get("currentPassword")),
                    newPassword: String(fd.get("newPassword")),
                    confirmPassword: String(fd.get("confirmPassword")),
                  });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) throw new Error(data.error || "Error");
                  e.currentTarget.reset();
                  setMsg({ type: "success", text: "Contraseña actualizada." });
                } catch (err) {
                  setMsg({ type: "error", text: err instanceof Error ? err.message : "Error" });
                }
              }}
            >
              <h3 className="text-sm font-medium">Cambiar contraseña</h3>
              <input name="currentPassword" type="password" placeholder="Contraseña actual" required className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-deep)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)]" />
              <input name="newPassword" type="password" placeholder="Nueva contraseña" required minLength={8} className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-deep)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)]" />
              <input name="confirmPassword" type="password" placeholder="Confirmar" required minLength={8} className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-deep)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)]" />
              <button type="submit" className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium hover:border-[var(--text)]">
                Actualizar contraseña
              </button>
            </form>
          </Section>

          <div className="flex flex-wrap gap-3 pt-2">
            <button type="button" className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm" onClick={logout}>
              Cerrar sesión
            </button>
            <button
              type="button"
              className="rounded-xl border border-red-500/40 px-4 py-2 text-sm text-red-500"
              onClick={async () => {
                await authApi.logoutAll();
                clearSessionToken();
                window.location.href = "/login";
              }}
            >
              Cerrar todas las sesiones
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof UserIcon; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-2">
        <Icon className="h-5 w-5 text-[var(--accent)]" />
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}
