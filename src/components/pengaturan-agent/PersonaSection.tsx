"use client";

import { Bot, Briefcase, Check, ClipboardList, Cog, Eye, Lightbulb, PenLine, Smile, Type } from "lucide-react";

import { usePengaturanAgent } from "@/hooks/usePengaturanAgent";
import { TONE_PREVIEW, type ToneId } from "@/types/pengaturan-agent";
import { KeywordTags } from "./KeywordTags";
import { PaCard, PaPageHeader, PaToggleRow } from "./ui";

const TONES: { id: ToneId; name: string; desc: string; icon: typeof Briefcase }[] = [
  { id: "formal", name: "Formal", desc: "Profesional & sopan", icon: Briefcase },
  { id: "santai", name: "Santai", desc: "Hangat & mudah akrab", icon: Smile },
  { id: "industri", name: "Industri", desc: "Teknikal & to the point", icon: Cog },
  { id: "custom", name: "Custom", desc: "Tulis instruksi sendiri", icon: PenLine },
];

const SOP_MAX = 1000;
const COMPANY_DESC_MAX = 4000;

export function PersonaSection() {
  const { form, setForm, setEscalation, companyName } = usePengaturanAgent();
  const company = companyName || "perusahaan kami";
  const sopLen = form.sop.length;
  const sopClass = sopLen > SOP_MAX ? " over" : sopLen > SOP_MAX * 0.9 ? " warn" : "";

  return (
    <div className="pa-section">
      <PaPageHeader
        title="Gaya Bahasa & Persona"
        desc="Tentukan karakter dan tone komunikasi AI Agent agar sesuai dengan brand kamu."
        showDiscard
      />

      {/* Identitas Agent */}
      <PaCard icon={<Bot />} title="Identitas Agent" subtitle="tampil di semua percakapan">
        <div className="pa-form-2col">
          <div className="pa-field">
            <label className="pa-label" htmlFor="pa-agent-name">
              Nama Agent <span className="pa-label-hint">(wajib)</span>
            </label>
            <div className="pa-input-prefix">
              <span className="pa-input-prefix-label"><Bot size={13} /></span>
              <input
                id="pa-agent-name"
                type="text"
                value={form.agentName}
                placeholder="Mis. Sari, Andi, Asisten Toko..."
                onChange={(e) => setForm({ agentName: e.target.value })}
              />
            </div>
            <div className="pa-helper">Nama ini muncul di header chat dan notifikasi pelanggan.</div>
          </div>
          <div className="pa-field">
            <label className="pa-label" htmlFor="pa-agent-role-title">Jabatan / Role</label>
            <input
              id="pa-agent-role-title"
              className="pa-input"
              type="text"
              value={form.roleTitle}
              placeholder="Mis. Sales Assistant, CS Agent..."
              onChange={(e) => setForm({ roleTitle: e.target.value })}
            />
            <div className="pa-helper">Opsional. Muncul di bawah nama agent.</div>
          </div>
        </div>
        <div className="pa-field">
          <label className="pa-label" htmlFor="pa-agent-tagline">Tagline / Deskripsi Singkat</label>
          <input
            id="pa-agent-tagline"
            className="pa-input"
            type="text"
            value={form.tagline}
            placeholder="Satu kalimat yang merepresentasikan agent..."
            onChange={(e) => setForm({ tagline: e.target.value })}
          />
        </div>
        <div className="pa-field">
          <label className="pa-label" htmlFor="pa-company-desc">
            Deskripsi Bisnis <span className="pa-label-hint">(dibaca AI)</span>
          </label>
          <textarea
            id="pa-company-desc"
            className="pa-textarea"
            style={{ minHeight: 96 }}
            value={form.companyDesc}
            maxLength={COMPANY_DESC_MAX}
            placeholder={"Jelaskan bisnis Anda secara singkat dan faktual: bidang usaha, apa yang dijual/ditawarkan, dan apa yang TIDAK dilakukan.\nCth: PT Maju Jaya adalah distributor suku cadang mesin industri di Jawa Timur. Kami tidak menjual retail."}
            onChange={(e) => setForm({ companyDesc: e.target.value })}
          />
          <div className="pa-char-row"><span>{form.companyDesc.length}/{COMPANY_DESC_MAX}</span></div>
          <div className="pa-helper">
            AI memakai teks ini sebagai gambaran bisnis di semua balasan dan follow-up. Jika kosong, AI diminta
            tidak mengarang bidang usaha, produk, atau harga.
          </div>
        </div>
      </PaCard>

      {/* Tone */}
      <PaCard icon={<Type />} title="Tone Komunikasi">
        <div className="pa-field">
          <label className="pa-label">Pilih gaya bahasa utama</label>
          <div className="pa-tone-grid">
            {TONES.map(({ id, name, desc, icon: Icon }) => {
              const selected = form.tone === id;
              return (
                <div
                  key={id}
                  role="radio"
                  aria-checked={selected}
                  tabIndex={0}
                  className={`pa-tone-pill${selected ? " selected" : ""}`}
                  onClick={() => setForm({ tone: id })}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setForm({ tone: id })}
                >
                  {selected && <Check className="pa-tone-check" />}
                  <div className="pa-tone-icon"><Icon /></div>
                  <div className="pa-tone-name">{name}</div>
                  <div className="pa-tone-desc">{desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pa-preview-box">
          <div className="pa-preview-label">
            <Eye size={13} /> Preview — balasan AI sebagai{" "}
            <strong style={{ color: "var(--pa-gray-800)" }}>{form.agentName || "AI Agent"}</strong>
          </div>
          <div className="pa-preview-bubble">
            <span>{TONE_PREVIEW[form.tone](company)}</span>
          </div>
        </div>

        <div className="pa-divider" style={{ marginTop: 14 }} />

        <PaToggleRow
          label="Gunakan Bahasa Indonesia"
          desc="AI selalu merespons dalam Bahasa Indonesia meskipun user menulis dalam bahasa lain."
          checked={form.langId}
          onChange={(v) => setForm({ langId: v })}
        />
        <PaToggleRow
          label="Auto-detect bahasa pelanggan"
          desc="AI menyesuaikan bahasa dengan bahasa yang digunakan pelanggan (Inggris, Mandarin, dll)."
          checked={form.langAuto}
          onChange={(v) => setForm({ langAuto: v })}
        />
        <PaToggleRow
          label="Gunakan sapaan nama pelanggan"
          desc={'AI menyebut nama pelanggan jika tersedia di profil (mis. "Pak Andi, ...").'}
          checked={form.greetName}
          onChange={(v) => setForm({ greetName: v })}
        />
      </PaCard>

      {/* SOP */}
      <PaCard
        icon={<ClipboardList />}
        title="Instruksi SOP Khusus"
        action={<span style={{ fontSize: 11, color: "var(--pa-gray-400)" }}>Opsional</span>}
      >
        <div className="pa-alert pa-alert-info" style={{ marginBottom: 14 }}>
          <Lightbulb />
          <span>
            Tulis instruksi khusus yang harus selalu diikuti AI — seperti cara menangani keluhan, larangan topik
            tertentu, atau alur penjualan kamu.
          </span>
        </div>
        <div className="pa-field">
          <label className="pa-label" htmlFor="pa-sop-text">Instruksi tambahan untuk AI</label>
          <textarea
            id="pa-sop-text"
            className="pa-textarea"
            style={{ minHeight: 110 }}
            value={form.sop}
            maxLength={SOP_MAX}
            placeholder={
              "Contoh:\n- Jangan menyebut nama kompetitor\n- Selalu tawarkan demo produk jika user bertanya tentang harga\n- Jika user komplain, langsung minta maaf dan eskalasi ke human agent\n- Gunakan satuan 'pcs' bukan 'buah' untuk produk industri"
            }
            onChange={(e) => setForm({ sop: e.target.value })}
          />
          <div className={`pa-char-row${sopClass}`}><span>{sopLen}/{SOP_MAX}</span></div>
        </div>
        <div className="pa-field">
          <label className="pa-label">Kata kunci yang memicu eskalasi ke manusia</label>
          <KeywordTags value={form.escalation.keywords} onChange={(keywords) => setEscalation({ keywords })} />
          <div className="pa-helper">Tekan Enter atau koma untuk menambah kata kunci.</div>
        </div>
      </PaCard>
    </div>
  );
}
