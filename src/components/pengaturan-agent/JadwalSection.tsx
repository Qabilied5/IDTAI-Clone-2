"use client";

import { Clock, CalendarOff, Plus, Trash2 } from "lucide-react";

import { usePengaturanAgent } from "@/hooks/usePengaturanAgent";
import type { JadwalRow, Timezone } from "@/types/pengaturan-agent";
import { PaCard, PaPageHeader, PaSwitch, PaToggleRow } from "./ui";

export function JadwalSection() {
  const { form, setForm, toast } = usePengaturanAgent();

  const patchRow = (id: number, patch: Partial<JadwalRow>) =>
    setForm({ jadwal: form.jadwal.map((r) => (r.id === id ? { ...r, ...patch } : r)) });

  const addRow = () => {
    const id = Math.max(0, ...form.jadwal.map((r) => r.id)) + 1;
    setForm({ jadwal: [...form.jadwal, { id, hari: "Hari Baru", mulai: "08:00", selesai: "17:00", aktif: true }] });
  };

  const removeRow = (id: number) => {
    if (form.jadwal.length <= 1) return toast("Minimal harus ada satu baris jadwal", "error");
    setForm({ jadwal: form.jadwal.filter((r) => r.id !== id) });
  };

  return (
    <div className="pa-section">
      <PaPageHeader title="Jam Kerja & Jadwal" desc="Kapan AI aktif full, kapan beralih ke mode offline atau jadwal khusus." />

      <PaCard icon={<Clock />} title="Jam Operasional">
        <PaToggleRow
          label="Aktif 24 jam / 7 hari"
          desc="AI selalu online tanpa batasan jam."
          checked={form.open24x7}
          onChange={(v) => setForm({ open24x7: v })}
        />
        <div className="pa-divider" />

        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="pa-jadwal-headrow">
            <span>Hari</span><span>Jam Mulai</span><span>Jam Selesai</span><span>Aktif</span><span />
          </div>
          <div className="pa-jadwal-rows">
            {form.jadwal.map((row) => (
              <div key={row.id} className={`pa-jadwal-row${row.aktif ? "" : " is-off"}`}>
                <input
                  className="pa-input pa-jadwal-day-input"
                  type="text"
                  value={row.hari}
                  placeholder="Mis. Senin, Senin – Jumat..."
                  aria-label="Nama hari"
                  onChange={(e) => patchRow(row.id, { hari: e.target.value })}
                />
                <input
                  className="pa-input"
                  type="time"
                  value={row.mulai}
                  disabled={!row.aktif}
                  aria-label="Jam mulai"
                  onChange={(e) => patchRow(row.id, { mulai: e.target.value })}
                />
                <input
                  className="pa-input"
                  type="time"
                  value={row.selesai}
                  disabled={!row.aktif}
                  aria-label="Jam selesai"
                  onChange={(e) => patchRow(row.id, { selesai: e.target.value })}
                />
                <PaSwitch checked={row.aktif} onChange={(v) => patchRow(row.id, { aktif: v })} label={`Aktif: ${row.hari}`} />
                <button type="button" className="pa-jadwal-remove-btn" title="Hapus baris" aria-label={`Hapus ${row.hari}`} onClick={() => removeRow(row.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="pa-btn pa-btn-ghost pa-btn-sm pa-jadwal-add-btn" onClick={addRow}>
            <Plus /> Tambah Hari
          </button>
        </div>

        <div className="pa-field" style={{ marginTop: 14 }}>
          <label className="pa-label" htmlFor="pa-timezone">Zona waktu</label>
          <select id="pa-timezone" className="pa-select" value={form.timezone}
                  onChange={(e) => setForm({ timezone: e.target.value as Timezone })}>
            <option value="WIB">WIB — Asia/Jakarta (UTC+7)</option>
            <option value="WITA">WITA — Asia/Makassar (UTC+8)</option>
            <option value="WIT">WIT — Asia/Jayapura (UTC+9)</option>
          </select>
        </div>
      </PaCard>

      <PaCard icon={<CalendarOff style={{ color: "var(--pa-amber)" }} />} title="Hari Libur Nasional">
        <PaToggleRow
          label="Nonaktifkan human agent di hari libur nasional"
          desc="AI tetap aktif, tapi takeover ke human agent dinonaktifkan selama hari libur."
          checked={form.holidayDisable}
          onChange={(v) => setForm({ holidayDisable: v })}
        />
      </PaCard>
    </div>
  );
}
