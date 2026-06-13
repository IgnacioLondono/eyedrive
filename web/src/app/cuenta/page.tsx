"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { EyeBrand } from "@/components/eye-brand";
import { useTheme } from "@/components/providers/theme-provider";
import { authApi, fetchMe } from "@/lib/api";
import { clearSessionToken } from "@/lib/auth";
import type { TrustedDevice, User } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { HardDrive, Moon, Sun } from "lucide-react";

export default function CuentaPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [msg, setMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    fetchMe().then((u) => {
      if (!u) router.replace("/login");
      else setUser(u);
    });
    authApi.listDevices().then(setDevices).catch(() => {});
  }, [router]);

  if (!user) return <div className="flex min-h-screen items-center justify-center text-[var(--muted)]">Cargando…</div>;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--panel)] px-6 py-4">
        <EyeBrand />
        <span className="text-lg font-bold">Eyedrive</span>
        <Link href="/" className="ml-4 flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--text)]"><HardDrive className="h-4 w-4" /> Mi unidad</Link>
        <button type="button" onClick={toggleTheme} className="ml-auto rounded-xl border border-[var(--border)] p-2">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </header>
      <main className="mx-auto max-w-2xl p-6">
        <h1 className="mb-6 text-2xl font-bold">Mi cuenta</h1>
        {msg && (
          <div className={cn("mb-4 rounded-xl border px-3 py-2 text-sm", msg.type === "error" ? "border-red-500/30 text-red-500" : "border-emerald-500/30 text-emerald-600")}>
            {msg.text}
          </div>
        )}
        <section className="mb-8 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
          <h2 className="mb-4 font-semibold">Perfil</h2>
          <form
            className="space-y-3"
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
            <label className="block text-sm"><span className="mb-1 block font-medium">Nombre</span>
              <input name="displayName" defaultValue={user.displayName} className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-deep)] px-3 py-2" />
            </label>
            <p className="text-sm text-[var(--muted)]">Correo: {user.email}</p>
            <button type="submit" className="rounded-xl bg-[var(--text)] px-4 py-2 text-sm font-medium text-[var(--bg)]">Guardar</button>
          </form>
        </section>
        <section className="mb-8 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
          <h2 className="mb-4 font-semibold">Código de acceso por correo</h2>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
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
            Pedir código al iniciar sesión en navegadores nuevos
          </label>
        </section>
        <section className="mb-8 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
          <h2 className="mb-4 font-semibold">Navegadores de confianza</h2>
          <ul className="mb-3 space-y-2 text-sm">
            {devices.map((d) => (
              <li key={d.id} className="rounded-lg border border-[var(--border)] px-3 py-2">{d.label} · hasta {formatDate(d.expiresAt)}</li>
            ))}
            {!devices.length && <li className="text-[var(--muted)]">Ninguno registrado</li>}
          </ul>
          <button type="button" className="text-sm text-[var(--muted)] hover:text-[var(--text)]" onClick={async () => {
            await authApi.revokeAllDevices();
            setDevices([]);
            setMsg({ type: "success", text: "Navegadores eliminados." });
          }}>Quitar todos</button>
        </section>
        <section className="mb-8 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
          <h2 className="mb-4 font-semibold">Contraseña</h2>
          <form className="space-y-3" onSubmit={async (e: FormEvent<HTMLFormElement>) => {
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
          }}>
            <input name="currentPassword" type="password" placeholder="Contraseña actual" required className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-deep)] px-3 py-2 text-sm" />
            <input name="newPassword" type="password" placeholder="Nueva contraseña" required minLength={8} className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-deep)] px-3 py-2 text-sm" />
            <input name="confirmPassword" type="password" placeholder="Confirmar" required minLength={8} className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-deep)] px-3 py-2 text-sm" />
            <button type="submit" className="rounded-xl bg-[var(--text)] px-4 py-2 text-sm font-medium text-[var(--bg)]">Cambiar contraseña</button>
          </form>
        </section>
        <div className="flex gap-3">
          <button type="button" className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm" onClick={async () => { await authApi.logout(); clearSessionToken(); router.replace("/login"); }}>Cerrar sesión</button>
          <button type="button" className="rounded-xl border border-red-500/40 px-4 py-2 text-sm text-red-500" onClick={async () => { await authApi.logoutAll(); clearSessionToken(); router.replace("/login"); }}>Cerrar todas las sesiones</button>
        </div>
      </main>
    </div>
  );
}
