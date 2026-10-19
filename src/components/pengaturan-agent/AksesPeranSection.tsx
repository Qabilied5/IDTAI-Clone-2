"use client";

import { CircleCheck, CircleX, Shield, Table } from "lucide-react";

import { usePengaturanAgent } from "@/hooks/usePengaturanAgent";
import type { SessionTimeout } from "@/types/pengaturan-agent";
import { PaCard, PaPageHeader, PaToggleRow } from "./ui";

/** y = akses penuh, n = tidak ada, string = akses terbatas (isi = tooltip). */
type Cell = "y" | "n" | string;
const ROLES = ["Super Admin", "Admin", "Agent", "Viewer"];
const MATRIX: { fitur: string; akses: [Cell, Cell, Cell, Cell] }[] = [
  { fitur: "Lihat percakapan", akses: ["y", "y", "y", "y"] },
  { fitur: "Balas percakapan", akses: ["y", "y", "y", "n"] },
  { fitur: "Takeover dari AI", akses: ["y", "y", "y", "n"] },
  { fitur: "Kelola leads & kontak", akses: ["y", "y", "Hanya kontak yang ditugaskan", "n"] },
  { fitur: "Lihat analitik", akses: ["y", "y", "Hanya data sendiri", "y"] },
  { fitur: "Edit Pengaturan Agent", akses: ["y", "y", "n", "n"] },
  { fitur: "Kelola Knowledge Base", akses: ["y", "y", "n", "n"] },
  { fitur: "Tambah / hapus user", akses: ["y", "n", "n", "n"] },
  { fitur: "Kelola integrasi & API", akses: ["y", "Hanya integrasi yang sudah ada", "n", "n"] },
  { fitur: "Hapus percakapan", akses: ["y", "n", "n", "n"] },
];

function AccessCell({ value }: { value: Cell }) {
  if (value === "y") return <CircleCheck className="pa-check" aria-label="Akses penuh" />;
  if (value === "n") return <CircleX className="pa-cross" aria-label="Tidak ada akses" />;
  return <span className="pa-partial" title={value} aria-label={`Akses terbatas: ${value}`}>~</span>;
}

export function AksesPeranSection() {
  const { form, setForm } = usePengaturanAgent();

  return (
    <div className="pa-section">
      <PaPageHeader
        title="Kontrol Akses & Peran"
        desc="Atur hak akses tiap peran dalam tim untuk menjaga keamanan data dan konfigurasi."
      />

      <PaCard flush icon={<Table />} title="Matriks Hak Akses">
        <div style={{ overflowX: "auto" }}>
          <table className="pa-matrix">
            <thead>
              <tr>
                <th style={{ minWidth: 200 }}>Fitur / Aksi</th>
                {ROLES.map((r) => <th key={r}>{r}</th>)}
              </tr>
            </thead>
            <tbody>
              {MATRIX.map((row) => (
                <tr key={row.fitur}>
                  <td><strong>{row.fitur}</strong></td>
                  {row.akses.map((c, i) => <td key={ROLES[i]}><AccessCell value={c} /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{
          padding: "10px 14px", background: "var(--pa-gray-50)", borderTop: "1px solid var(--pa-gray-100)",
          fontSize: 11, color: "var(--pa-gray-400)", display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><CircleCheck size={13} style={{ color: "var(--pa-green)" }} /> Akses penuh</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span className="pa-partial">~</span> Akses terbatas</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><CircleX size={13} style={{ color: "var(--pa-gray-200)" }} /> Tidak ada akses</span>
        </div>
      </PaCard>

      <PaCard icon={<Shield />} title="Keamanan Akun">
        <PaToggleRow
          label="Wajib verifikasi 2 langkah (2FA)"
          desc="Semua user dengan peran Admin ke atas wajib mengaktifkan autentikasi dua faktor."
          checked={form.require2fa}
          onChange={(v) => setForm({ require2fa: v })}
        />
        <PaToggleRow
          label="Batasi login per perangkat"
          desc="Tiap akun hanya bisa login dari satu perangkat aktif sekaligus."
          checked={form.singleDevice}
          onChange={(v) => setForm({ singleDevice: v })}
        />
        <PaToggleRow
          label="Auto logout sesi tidak aktif"
          desc="Sesi login otomatis berakhir setelah tidak aktif selama durasi yang ditentukan."
          checked={form.autoLogout}
          onChange={(v) => setForm({ autoLogout: v })}
        />
        <div className="pa-field" style={{ marginTop: 6 }}>
          <label className="pa-label" htmlFor="pa-session-timeout">Durasi auto logout</label>
          <select id="pa-session-timeout" className="pa-select" style={{ maxWidth: 220 }} value={form.sessionTimeout}
                  onChange={(e) => setForm({ sessionTimeout: e.target.value as SessionTimeout })}>
            {(["30 menit", "1 jam", "4 jam", "8 jam"] as SessionTimeout[]).map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>
      </PaCard>
    </div>
  );
}
