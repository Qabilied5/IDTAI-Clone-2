"use client";

import { useEffect, useState } from "react";
import { Check, Copy, KeyRound, Loader2, UserPlus, X } from "lucide-react";

import { useTeam, type NewUserInput } from "@/hooks/useTeam";
import { useAuthStore } from "@/store/useAuthStore";

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  agent: "Agent",
  viewer: "Viewer",
};
const ROLE_HELP: Record<string, string> = {
  admin: "Admin — kelola pengaturan dan tim",
  agent: "Agent — balas dan takeover percakapan",
  viewer: "Viewer — hanya melihat laporan",
};

const input =
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[12.5px] text-ink outline-none focus:border-accent";
const btnPrimary =
  "inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-[12.5px] font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";
const btnGhost =
  "inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[12px] font-medium text-neutral-600 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50";

function fmt(iso: string | null) {
  if (!iso) return "Belum pernah";
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

/** Kartu "Anggota Tim": hanya dirender untuk admin (server tetap memeriksa ulang). */
export function TeamMembers() {
  const role = useAuthStore((s) => s.user?.role);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || (role !== "admin" && role !== "super_admin")) return null;
  return <TeamMembersInner />;
}

function TeamMembersInner() {
  const { users, loading, error, reveal, dismissReveal, addUser, patchUser } = useTeam();
  const orgName = useAuthStore((s) => s.user?.organizationName);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewUserInput & { password: string }>({ name: "", email: "", role: "agent", password: "" });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setBusy(true);
    const err = await addUser({
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      ...(form.password ? { password: form.password } : {}),
    });
    setBusy(false);
    if (err) return setFormError(err);
    setForm({ name: "", email: "", role: "agent", password: "" });
    setOpen(false);
  };

  const act = async (id: string, patch: Parameters<typeof patchUser>[1]) => {
    setRowError(null);
    const err = await patchUser(id, patch);
    if (err) setRowError(err);
  };

  const copy = async () => {
    if (!reveal) return;
    try {
      await navigator.clipboard.writeText(reveal.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard bisa diblokir; password tetap terlihat di layar */ }
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-[13px] font-semibold text-ink">Anggota Tim</div>
          <div className="mt-0.5 text-[12px] text-neutral-400">
            User yang ditambahkan di sini otomatis tergabung ke perusahaan{orgName ? <> <strong className="text-neutral-600">{orgName}</strong></> : " Anda"}.
          </div>
        </div>
        {!open && (
          <button type="button" className={btnPrimary} onClick={() => setOpen(true)}>
            <UserPlus size={14} /> Tambah User
          </button>
        )}
      </div>

      {reveal && (
        <div role="alert" className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12.5px] text-amber-900">
          <div className="font-semibold">Password sementara untuk {reveal.email}</div>
          <div className="mt-1.5 flex items-center gap-2">
            <code className="rounded bg-white px-2 py-1 font-mono text-[13px] tracking-wide">{reveal.password}</code>
            <button type="button" className={btnGhost} onClick={copy}>
              {copied ? <><Check size={13} /> Tersalin</> : <><Copy size={13} /> Salin</>}
            </button>
            <button type="button" className={btnGhost} onClick={dismissReveal} aria-label="Tutup"><X size={13} /></button>
          </div>
          <div className="mt-1.5 text-[11.5px]">
            Bagikan ke user secara aman. Password ini <strong>hanya ditampilkan sekali</strong> dan tidak bisa dilihat lagi.
          </div>
        </div>
      )}

      {open && (
        <form onSubmit={submit} className="mb-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="text-[12px] font-medium text-neutral-600">
              Nama lengkap
              <input className={input + " mt-1"} required minLength={2} maxLength={100} value={form.name}
                     onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="cth. Budi Wicaksono" />
            </label>
            <label className="text-[12px] font-medium text-neutral-600">
              Alamat email
              <input className={input + " mt-1"} type="email" required maxLength={255} value={form.email}
                     onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="nama@perusahaan.com" />
            </label>
            <label className="text-[12px] font-medium text-neutral-600">
              Peran
              <select className={input + " mt-1"} value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value as NewUserInput["role"] })}>
                {(["admin", "agent", "viewer"] as const).map((r) => <option key={r} value={r}>{ROLE_HELP[r]}</option>)}
              </select>
            </label>
            <label className="text-[12px] font-medium text-neutral-600">
              Password <span className="font-normal text-neutral-400">(kosongkan untuk dibuatkan otomatis)</span>
              <input className={input + " mt-1"} type="text" autoComplete="off" minLength={8} maxLength={72} value={form.password}
                     onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="min. 8 karakter" />
            </label>
          </div>
          {formError && <div role="alert" className="mt-3 text-[12px] font-medium text-red-600">{formError}</div>}
          <div className="mt-3 flex gap-2">
            <button type="submit" className={btnPrimary} disabled={busy}>
              {busy ? <><Loader2 size={14} className="animate-spin" /> Menyimpan...</> : <><UserPlus size={14} /> Tambah User</>}
            </button>
            <button type="button" className={btnGhost} onClick={() => { setOpen(false); setFormError(null); }}>Batal</button>
          </div>
        </form>
      )}

      {error && <div role="alert" className="mb-2 text-[12px] font-medium text-red-600">{error}</div>}
      {rowError && <div role="alert" className="mb-2 text-[12px] font-medium text-red-600">{rowError}</div>}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-[12.5px]">
          <thead>
            <tr className="border-b border-neutral-100 text-[11px] uppercase tracking-wide text-neutral-400">
              <th className="py-2 pr-3 font-semibold">User</th>
              <th className="py-2 pr-3 font-semibold">Peran</th>
              <th className="py-2 pr-3 font-semibold">Status</th>
              <th className="py-2 pr-3 font-semibold">Login terakhir</th>
              <th className="py-2 font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="py-5 text-center text-neutral-400">Memuat...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="py-5 text-center text-neutral-400">Belum ada user.</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-neutral-50 align-middle">
                  <td className="py-2.5 pr-3">
                    <div className="font-medium text-ink">{u.name}{u.isSelf && <span className="ml-1.5 text-[11px] font-normal text-neutral-400">(Anda)</span>}</div>
                    <div className="text-[11.5px] text-neutral-400">{u.email}</div>
                  </td>
                  <td className="py-2.5 pr-3">
                    {u.isSelf || u.role === "super_admin" ? (
                      <span className="text-neutral-600">{ROLE_LABEL[u.role] ?? u.role}</span>
                    ) : (
                      <select aria-label={`Peran ${u.name}`} className={input + " !w-auto !py-1"} value={u.role}
                              onChange={(e) => void act(u.id, { role: e.target.value })}>
                        {(["admin", "agent", "viewer"] as const).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                      </select>
                    )}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className={u.isActive ? "font-medium text-emerald-600" : "font-medium text-neutral-400"}>
                      {u.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-neutral-500">{fmt(u.lastLoginAt)}</td>
                  <td className="py-2.5">
                    {!u.isSelf && u.role !== "super_admin" && (
                      <div className="flex gap-1.5">
                        <button type="button" className={btnGhost} onClick={() => void act(u.id, { isActive: !u.isActive })}>
                          {u.isActive ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                        <button type="button" className={btnGhost} aria-label={`Reset password ${u.name}`}
                                onClick={() => window.confirm(`Reset password ${u.name}? Password lama tidak akan berlaku lagi.`) && void act(u.id, { resetPassword: true })}>
                          <KeyRound size={13} /> Reset
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
