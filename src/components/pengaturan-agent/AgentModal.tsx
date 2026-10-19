"use client";

import { useEffect, useState } from "react";
import { Send, UserPlus, X } from "lucide-react";

import { usePengaturanAgent } from "@/hooks/usePengaturanAgent";
import type { PicAgent } from "@/types/pengaturan-agent";

/** Modal tambah / edit agent. `agent` = null → mode tambah. */
export function AgentModal({ agent, onClose }: { agent: PicAgent | null; onClose: () => void }) {
  const { createAgent, updateAgent, form, toast } = usePengaturanAgent();
  const [nama, setNama] = useState(agent?.nama ?? "");
  const [email, setEmail] = useState(agent?.email ?? "");
  const [role, setRole] = useState(agent?.role ?? "agent");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async () => {
    if (!nama.trim()) return toast("Nama wajib diisi", "error");
    if (!email.trim()) return toast("Email wajib diisi", "error");
    setBusy(true);
    const ok = agent
      ? await updateAgent(agent.id, { nama: nama.trim(), email: email.trim(), role })
      : await createAgent({ nama: nama.trim(), email: email.trim(), role });
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <div className="pa-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="pa-modal-agent-title">
      <div className="pa-modal">
        <div className="pa-modal-header">
          <div className="pa-modal-title">
            <UserPlus size={16} style={{ color: "var(--pa-red)" }} />
            <span id="pa-modal-agent-title">{agent ? `Edit Agent: ${agent.nama}` : "Undang Agent Baru"}</span>
          </div>
          <button type="button" className="pa-modal-close" onClick={onClose} aria-label="Tutup"><X /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <div className="pa-modal-body">
            <div className="pa-field">
              <label className="pa-label" htmlFor="pa-modal-agent-nama">Nama lengkap</label>
              <input id="pa-modal-agent-nama" className="pa-input" type="text" placeholder="cth. Budi Wicaksono"
                     value={nama} onChange={(e) => setNama(e.target.value)} required />
            </div>
            <div className="pa-field">
              <label className="pa-label" htmlFor="pa-modal-agent-email">Alamat email</label>
              <input id="pa-modal-agent-email" className="pa-input" type="email" placeholder="nama@perusahaan.com"
                     value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="pa-field">
              <label className="pa-label" htmlFor="pa-modal-agent-role">Peran dalam tim</label>
              <select id="pa-modal-agent-role" className="pa-select" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="agent">Agent — bisa menerima takeover percakapan</option>
                <option value="admin">Admin — bisa edit pengaturan dan kelola agent</option>
                <option value="viewer">Viewer — hanya bisa melihat laporan</option>
              </select>
            </div>
            <div className="pa-field">
              <label className="pa-label">Brand yang bisa diakses</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {form.brands.map((b, i) => (
                  <label key={b.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, cursor: "pointer" }}>
                    <input type="checkbox" defaultChecked={i === 0} /> {b.name}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="pa-modal-footer">
            <button type="button" className="pa-btn pa-btn-ghost" onClick={onClose}>Batal</button>
            <button type="submit" className="pa-btn pa-btn-primary" disabled={busy}>
              <Send /> {agent ? "Simpan" : "Kirim Undangan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
