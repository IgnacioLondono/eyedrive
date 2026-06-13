"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DriveApp } from "@/components/drive/drive-app";
import { fetchMe } from "@/lib/api";
import type { User } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetchMe().then((u) => {
      if (!u) router.replace("/login");
      else setUser(u);
    });
  }, [router]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--muted)]">
        Cargando tu unidad…
      </div>
    );
  }

  return <DriveApp user={user} />;
}
