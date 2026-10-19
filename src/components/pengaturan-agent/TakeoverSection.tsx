"use client";

import type { ReactNode } from "react";
import {
  AlarmClock, AlertTriangle, ArrowRight, Banknote, Bot, Check, FileText, GitBranch, GripVertical,
  ListChecks, Plus, Repeat, Settings, User, UserCheck,
} from "lucide-react";

import { usePengaturanAgent } from "@/hooks/usePengaturanAgent";
import type { EscalationTriggers } from "@/types/pengaturan-agent";
import { PaCard, PaPageHeader, PaSwitch, PaToggleRow } from "./ui";

function FlowStep({ box, label, highlight }: { box: ReactNode; label: string; highlight?: boolean }) {
  return (
    <div className="pa-flow-step">
      <div className={`pa-flow-box${highlight ? " highlight" : ""}`}>{box}</div>
      <div className="pa-flow-label">{label}</div>
    </div>
  );
}
const Arrow = () => <div className="pa-flow-arrow"><ArrowRight /></div>;

interface Rule {
  key: keyof EscalationTriggers;
  icon: ReactNode;
  title: string;
  subtitle?: string;
}

export function TakeoverSection() {
  const { form, setForm, setEscalation } = usePengaturanAgent();
  const e = form.escalation;
  const kw = e.keywords;

  const keywordSubtitle = kw.length
    ? `${kw.slice(0, 4).join(", ")}${kw.length > 4 ? ", ..." : ""} — ${kw.length} kata kunci aktif`
    : "Belum ada kata kunci — tambahkan di halaman Gaya Bahasa & Persona";

  const rules: Rule[] = [
    { key: "sensitiveKeyword", icon: <FileText />, title: "Kata kunci sensitif terdeteksi", subtitle: keywordSubtitle },
    { key: "repeatedQuestion", icon: <Repeat />, title: "Pertanyaan diulang lebih dari 2x", subtitle: "AI tidak berhasil menjawab dengan memuaskan" },
    { key: "priceNegotiation", icon: <Banknote />, title: "Negosiasi harga atau diskon", subtitle: "User meminta harga khusus di atas limit yang diizinkan" },
    { key: "humanRequest", icon: <UserCheck />, title: "User minta bicara dengan manusia", subtitle: '"Admin", "manusia", "cs", "agen" terdeteksi' },
    { key: "stalled", icon: <AlarmClock style={{ color: "var(--pa-amber)" }} />, title: "Tidak ada respons > 5 menit", subtitle: "Percakapan dianggap stall, dialihkan ke antrian" },
  ];

  const setTrigger = (key: keyof EscalationTriggers, v: boolean) =>
    setEscalation({ triggers: { ...e.triggers, [key]: v } });

  return (
    <div className="pa-section">
      <PaPageHeader title="Aturan Takeover" desc="Kapan dan bagaimana AI menyerahkan kendali percakapan ke manusia." />

      <PaCard icon={<GitBranch />} title="Alur Eskalasi">
        <div className="pa-flow">
          <FlowStep highlight box={<><Bot />AI Agent</>} label="Menangani otomatis" />
          <Arrow />
          <FlowStep box={<><AlertTriangle style={{ color: "var(--pa-amber)" }} />Trigger</>} label="Kondisi takeover" />
          <Arrow />
          <FlowStep box={<><User style={{ color: "var(--pa-green)" }} />Human Agent</>} label="Mengambil alih chat" />
          <Arrow />
          <FlowStep box={<><Check style={{ color: "var(--pa-green)" }} />Resolved</>} label="Percakapan selesai" />
        </div>
      </PaCard>

      <PaCard
        icon={<ListChecks />}
        title="Kondisi Pemicu Takeover"
        action={
          <button type="button" className="pa-btn pa-btn-ghost pa-btn-sm" disabled title="Segera hadir">
            <Plus /> Tambah Rule
          </button>
        }
      >
        <div className="pa-rule-list">
          {rules.map((r) => {
            const on = e.triggers[r.key];
            return (
              <div key={r.key} className={`pa-rule-item${on ? " active-rule" : ""}`}>
                <GripVertical className="pa-rule-drag" />
                <div className="pa-rule-icon">{r.icon}</div>
                <div className="pa-rule-text">
                  <div className="pa-rule-title">{r.title}</div>
                  <div className="pa-rule-subtitle">{r.subtitle}</div>
                  {r.key === "priceNegotiation" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                      <span style={{ fontSize: 11, color: "var(--pa-gray-500)" }}>
                        Diskon maksimal yang boleh disetujui AI sendiri:
                      </span>
                      <input
                        type="number"
                        className="pa-input"
                        style={{ width: 64, padding: "4px 6px" }}
                        min={0}
                        max={100}
                        value={e.priceLimitPercent}
                        aria-label="Batas diskon maksimal (%)"
                        onChange={(ev) => setEscalation({ priceLimitPercent: Math.min(100, Math.max(0, Number(ev.target.value) || 0)) })}
                      />
                      <span style={{ fontSize: 11, color: "var(--pa-gray-500)" }}>%</span>
                    </div>
                  )}
                </div>
                <PaSwitch className="pa-rule-toggle" checked={on} onChange={(v) => setTrigger(r.key, v)} label={r.title} />
              </div>
            );
          })}
        </div>
      </PaCard>

      <PaCard icon={<Settings />} title="Pengaturan Handoff">
        <PaToggleRow
          label="Kirim ringkasan AI ke human agent"
          desc="Saat takeover, agent menerima ringkasan otomatis konteks dan intent percakapan."
          checked={form.sendSummary}
          onChange={(v) => setForm({ sendSummary: v })}
        />
        <PaToggleRow
          label="Beri tahu pelanggan saat takeover"
          desc="Sebelum percakapan benar-benar dialihkan ke Agent (baik dipicu otomatis oleh rule di atas maupun ditakeover manual oleh CS), pelanggan dikirimi pesan transisi ini dulu."
          checked={e.notifyCustomer}
          onChange={(v) => setEscalation({ notifyCustomer: v })}
        >
          {e.notifyCustomer && (
            <div style={{ marginTop: 8 }}>
              <input
                type="text"
                className="pa-input"
                style={{ width: "100%", maxWidth: 420 }}
                maxLength={200}
                value={e.handoffMessage}
                placeholder="Pesan yang dikirim ke pelanggan sebelum takeover..."
                aria-label="Pesan transisi ke pelanggan"
                onChange={(ev) => setEscalation({ handoffMessage: ev.target.value })}
              />
            </div>
          )}
        </PaToggleRow>
        <PaToggleRow
          label="AI kembali aktif setelah human agent selesai"
          desc="Setelah percakapan diselesaikan oleh human, AI siap menangani percakapan berikutnya dari kontak yang sama."
          checked={form.aiResumes}
          onChange={(v) => setForm({ aiResumes: v })}
        />
      </PaCard>
    </div>
  );
}
