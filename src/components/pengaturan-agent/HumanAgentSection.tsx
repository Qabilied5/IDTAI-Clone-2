"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight, Pencil, Trash2, UserPlus, Users } from "lucide-react";

import { usePengaturanAgent } from "@/hooks/usePengaturanAgent";
import type { DistMode, PicAgent } from "@/types/pengaturan-agent";
import { AgentModal } from "./AgentModal";
import { PaCard, PaPageHeader, PaToggleRow } from "./ui";

const ROLE_LABEL: Record<string, string> = {
  superadmin: "Super Admin", super_admin: "Super Admin", admin: "Admin", agent: "Agent", viewer: "Viewer",
};
const ROLE_CLASS: Record<string, string> = {
  superadmin: "pa-role-superadmin", super_admin: "pa-role-superadmin", admin: "pa-role-admin",
  agent: "pa-role-agent", viewer: "pa-role-viewer",
};
const STATUS_LABEL: Record<string, string> = { online: "Online", offline: "Offline", busy: "Sibuk" };

const DIST_OPTIONS: { value: DistMode; label: string }[] = [
  { value: "round-robin", label: "Round Robin — bergilir rata ke semua agent online" },
  { value: "least-busy", label: "Least Busy — ke agent dengan percakapan paling sedikit" },
  { value: "manual", label: "Manual — admin pilih agent secara manual" },
  { value: "skill", label: "Skill-based — cocokkan berdasarkan keahlian agent" },
];

type ModalState = { mode: "closed" } | { mode: "add" } | { mode: "edit"; agent: PicAgent };

export function HumanAgentSection() {
  const { form, setForm, agents, agentsLoading, toggleAgentStatus, removeAgent } = usePengaturanAgent();
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<ModalState>({ mode: "closed" });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? agents.filter((a) => a.nama.toLowerCase().includes(q) || a.email.toLowerCase().includes(q)) : agents;
  }, [agents, query]);

  const online = agents.filter((a) => a.status === "online").length;
  const busy = agents.filter((a) => a.status === "busy").length;
  const offline = agents.length - online - busy;

  return (
    <div className="pa-section">
      <PaPageHeader
        title="Manajemen Human Agent"
        desc="Atur siapa saja yang dapat menerima takeover percakapan dari AI."
        actions={
          <button type="button" className="pa-btn pa-btn-primary" onClick={() => setModal({ mode: "add" })}>
            <UserPlus /> Undang Agent
          </button>
        }
      />

      <div className="pa-alert pa-alert-success">
        <Users />
        <span>
          <strong>{agents.length} agent terdaftar</strong>
          {agents.length > 0 && <> — {online} online{busy > 0 && <>, {busy} sibuk</>}, {offline} offline.</>}
        </span>
      </div>

      <PaCard
        flush
        icon={<Users />}
        title="Daftar Agent"
        subtitle="aktif untuk menerima percakapan"
        action={
          <input
            className="pa-input"
            style={{ width: 200 }}
            type="text"
            placeholder="Cari nama atau email..."
            aria-label="Cari agent"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        }
      >
        <div style={{ overflowX: "auto" }}>
          <table className="pa-agent-table">
            <thead>
              <tr><th>Agent</th><th>Peran</th><th>Status</th><th>Percakapan Aktif</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              {agentsLoading ? (
                <tr className="pa-empty-row"><td colSpan={5}>Memuat...</td></tr>
              ) : filtered.length === 0 ? (
                <tr className="pa-empty-row">
                  <td colSpan={5}>
                    {agents.length === 0 ? 'Belum ada agent — klik "Undang Agent" untuk menambahkan.' : "Tidak ada agent yang cocok."}
                  </td>
                </tr>
              ) : (
                filtered.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="pa-agent-name-cell">
                        <div className="pa-agent-av">{a.initials}</div>
                        <div>
                          <div className="pa-agent-name">{a.nama}</div>
                          <div className="pa-agent-email">{a.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className={`pa-role-badge ${ROLE_CLASS[a.role] ?? "pa-role-viewer"}`}>{ROLE_LABEL[a.role] ?? a.role}</span></td>
                    <td>
                      <span
                        className={`pa-status-pill ${a.status}`}
                        style={{ cursor: "pointer" }}
                        role="button"
                        tabIndex={0}
                        title="Klik untuk ubah status online/offline"
                        onClick={() => void toggleAgentStatus(a.id)}
                        onKeyDown={(e) => e.key === "Enter" && void toggleAgentStatus(a.id)}
                      >
                        <span className="dot" />{STATUS_LABEL[a.status] ?? a.status}
                      </span>
                    </td>
                    <td style={{ color: "var(--pa-gray-600)", fontSize: 12 }}>{a.chat > 0 ? `${a.chat} percakapan` : "—"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button type="button" className="pa-btn pa-btn-ghost pa-btn-sm" onClick={() => setModal({ mode: "edit", agent: a })}>
                          <Pencil /> Edit
                        </button>
                        {a.role !== "superadmin" && a.role !== "super_admin" && (
                          <button type="button" className="pa-btn pa-btn-danger pa-btn-sm" aria-label={`Hapus ${a.nama}`} onClick={() => void removeAgent(a.id)}>
                            <Trash2 />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PaCard>

      <PaCard icon={<ArrowLeftRight />} title="Distribusi Percakapan">
        <div className="pa-field">
          <label className="pa-label" htmlFor="pa-dist-mode">Mode distribusi ke human agent</label>
          <select id="pa-dist-mode" className="pa-select" value={form.distMode}
                  onChange={(e) => setForm({ distMode: e.target.value as DistMode })}>
            {DIST_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <PaToggleRow
          label="Batas percakapan per agent"
          desc="Batasi jumlah percakapan aktif maksimum per human agent agar tidak overload."
          checked={form.capEnabled}
          onChange={(v) => setForm({ capEnabled: v })}
        />
        <div className="pa-field" style={{ marginTop: 8 }}>
          <label className="pa-label" htmlFor="pa-cap-num">Maks. percakapan per agent</label>
          <input id="pa-cap-num" className="pa-input" type="number" min={1} max={50} style={{ maxWidth: 120 }}
                 value={form.capNum}
                 onChange={(e) => setForm({ capNum: Math.min(50, Math.max(1, Number(e.target.value) || 1)) })} />
        </div>
      </PaCard>

      {modal.mode !== "closed" && (
        <AgentModal agent={modal.mode === "edit" ? modal.agent : null} onClose={() => setModal({ mode: "closed" })} />
      )}
    </div>
  );
}
