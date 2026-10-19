"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { TeamMembers } from "@/components/pengaturan/TeamMembers";
import { useAuthStore } from "@/store/useAuthStore";

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  agent: "Agent",
  viewer: "Viewer",
};

export default function PengaturanPage() {
  const user = useAuthStore((s) => s.user);

  // Store dibaca dari localStorage di browser; tunggu mount agar tidak hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const u = mounted ? user : null;

  const rows: [string, string][] = [
    ["Nama", u?.name ?? "—"],
    ["Email", u?.email ?? "—"],
    ["Peran", u ? ROLE_LABEL[u.role] ?? u.role : "—"],
    ["Perusahaan", u?.organizationName ?? "—"],
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-ink">Pengaturan</h1>
        <p className="mt-0.5 text-[12.5px] text-neutral-400">
          Informasi akun dan perusahaan Anda.
        </p>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="mb-3 text-[13px] font-semibold text-ink">Profil Akun</div>
        <dl className="grid max-w-[520px] grid-cols-[120px_1fr] gap-y-2.5 text-[12.5px]">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-neutral-400">{k}</dt>
              <dd className="font-medium text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <TeamMembers />

      <div className="rounded-xl border border-neutral-200 bg-white p-5 text-[12.5px] text-neutral-500">
        Pengaturan persona, human agent, jadwal, dan brand ada di{" "}
        <Link href="/pengaturan-agent" className="font-medium text-accent hover:underline">
          Pengaturan Agent
        </Link>
        .
      </div>
    </div>
  );
}
