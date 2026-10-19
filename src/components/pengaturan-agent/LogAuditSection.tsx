"use client";

import type { ReactNode } from "react";
import { Download, History, Info } from "lucide-react";

import { PaCard, PaPageHeader } from "./ui";

interface LogRow {
  waktu: string;
  aksi: ReactNode;
  user: string;
  peran: "superadmin" | "admin" | "agent";
  peranLabel: string;
}

/* Data contoh dari referensi — belum ada tabel/endpoint audit di backend. */
const SAMPLE: LogRow[] = [
  { waktu: "15 Jun, 09:14", aksi: <>Mengubah tone agent dari <strong>Formal</strong> ke <strong>Santai</strong></>, user: "Budi Wicaksono", peran: "superadmin", peranLabel: "Super Admin" },
  { waktu: "15 Jun, 08:52", aksi: <>Menambah agent baru: <strong>Maya Lestari</strong> (Viewer)</>, user: "Sari Dewi", peran: "admin", peranLabel: "Admin" },
  { waktu: "14 Jun, 16:30", aksi: <>Takeover percakapan ID #4821 dari AI ke human</>, user: "Andi Prasetyo", peran: "agent", peranLabel: "Agent" },
  { waktu: "14 Jun, 14:05", aksi: <>Mengaktifkan rule takeover: <strong>User minta bicara dengan manusia</strong></>, user: "Budi Wicaksono", peran: "superadmin", peranLabel: "Super Admin" },
  { waktu: "13 Jun, 11:20", aksi: <>Menambah brand baru: <strong>Indotrading Kimia</strong></>, user: "Budi Wicaksono", peran: "superadmin", peranLabel: "Super Admin" },
  { waktu: "12 Jun, 08:00", aksi: <>Login dari perangkat baru (Chrome / Jakarta)</>, user: "Rini Kusuma", peran: "agent", peranLabel: "Agent" },
];

const GRID = { display: "grid", gridTemplateColumns: "130px 1fr 120px 100px", alignItems: "center" } as const;

export function LogAuditSection() {
  return (
    <div className="pa-section">
      <PaPageHeader
        title="Log Audit"
        desc="Rekam jejak semua perubahan konfigurasi dan aktivitas admin."
        actions={
          <button type="button" className="pa-btn pa-btn-ghost" disabled title="Segera hadir — belum ada data audit">
            <Download /> Export CSV
          </button>
        }
      />

      <div className="pa-alert pa-alert-info">
        <Info />
        <span>
          Tampilan di bawah adalah <strong>contoh data</strong>. Pencatatan log audit belum terhubung ke database,
          jadi baris-baris ini bukan aktivitas nyata di perusahaan Anda.
        </span>
      </div>

      <PaCard
        flush
        icon={<History />}
        title="Riwayat Aktivitas"
        action={
          <div style={{ display: "flex", gap: 6 }}>
            <select className="pa-select" aria-label="Filter tipe" style={{ width: 140, padding: "5px 10px", fontSize: 11 }}>
              <option>Semua tipe</option>
              <option>Perubahan setting</option>
              <option>Login / Logout</option>
              <option>Takeover</option>
              <option>Tambah/Hapus user</option>
            </select>
            <input className="pa-input" type="date" aria-label="Tanggal" style={{ width: 160, padding: "5px 10px", fontSize: 11 }} />
          </div>
        }
      >
        <div>
          <div style={{
            ...GRID, padding: "8px 14px", background: "var(--pa-gray-50)", borderBottom: "1px solid var(--pa-gray-200)",
            fontSize: 10, fontWeight: 600, color: "var(--pa-gray-400)", letterSpacing: ".5px", textTransform: "uppercase",
          }}>
            <span>Waktu</span><span>Aksi</span><span>User</span><span>Peran</span>
          </div>
          {SAMPLE.map((r, i) => (
            <div key={i} style={{
              ...GRID, padding: "10px 14px", fontSize: 12,
              borderBottom: i < SAMPLE.length - 1 ? "1px solid var(--pa-gray-100)" : undefined,
            }}>
              <span style={{ color: "var(--pa-gray-400)", fontSize: 11 }}>{r.waktu}</span>
              <span>{r.aksi}</span>
              <span style={{ color: "var(--pa-gray-600)" }}>{r.user}</span>
              <span className={`pa-role-badge pa-role-${r.peran}`} style={{ fontSize: 10 }}>{r.peranLabel}</span>
            </div>
          ))}
        </div>
      </PaCard>
    </div>
  );
}
