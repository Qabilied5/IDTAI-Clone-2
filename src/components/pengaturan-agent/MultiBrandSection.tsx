"use client";

import { useState } from "react";
import { Info, Lock, Plus, Settings } from "lucide-react";

import { usePengaturanAgent } from "@/hooks/usePengaturanAgent";
import type { Brand } from "@/types/pengaturan-agent";
import { BrandModal } from "./BrandModal";
import { PaCard, PaPageHeader, PaToggleRow } from "./ui";

type ModalState = { mode: "closed" } | { mode: "add" } | { mode: "edit"; brand: Brand };

export function MultiBrandSection() {
  const { form, setForm, toast } = usePengaturanAgent();
  const [modal, setModal] = useState<ModalState>({ mode: "closed" });

  const select = (id: number) => {
    const target = form.brands.find((b) => b.id === id);
    if (!target) return;
    setForm({ brands: form.brands.map((b) => ({ ...b, active: b.id === id })) });
    toast(`Brand "${target.name}" dipilih sebagai aktif`, "success");
  };

  return (
    <div className="pa-section">
      <PaPageHeader
        title="Konfigurasi Multi-Brand"
        desc="Satu AI, banyak brand — tiap brand punya persona, tone, dan agent sendiri."
        actions={
          <button type="button" className="pa-btn pa-btn-primary" onClick={() => setModal({ mode: "add" })}>
            <Plus /> Tambah Brand
          </button>
        }
      />

      <div className="pa-alert pa-alert-info">
        <Info />
        <span>
          Brand yang <strong>aktif</strong> akan digunakan sebagai konfigurasi default AI Agent. Klik kartu brand untuk
          mengaktifkannya, atau klik <strong>⚙</strong> untuk edit konfigurasi spesifik.
        </span>
      </div>

      <div className="pa-brand-grid">
        {form.brands.map((b) => (
          <div key={b.id} className={`pa-brand-card${b.active ? " active-brand" : ""}`} onClick={() => select(b.id)}>
            <div className="pa-brand-card-top" style={{ background: b.color }} />
            <div className="pa-brand-card-body">
              <div className="pa-brand-card-head">
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <div className="pa-brand-logo" style={{ background: b.color }}>{b.abbr}</div>
                  <div>
                    <div className="pa-brand-name">{b.name}</div>
                    <div className="pa-brand-cat">{b.cat}</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="pa-btn pa-btn-ghost pa-btn-sm"
                  aria-label={`Edit brand ${b.name}`}
                  onClick={(e) => { e.stopPropagation(); setModal({ mode: "edit", brand: b }); }}
                >
                  <Settings />
                </button>
              </div>
              <div className="pa-brand-stats">
                <div className="pa-brand-stat">
                  <div className="pa-brand-stat-val">{b.conv.toLocaleString("id-ID")}</div>
                  <div className="pa-brand-stat-lbl">Percakapan</div>
                </div>
                <div className="pa-brand-stat">
                  <div className="pa-brand-stat-val">{b.agents}</div>
                  <div className="pa-brand-stat-lbl">Agent</div>
                </div>
              </div>
            </div>
          </div>
        ))}

        <div className="pa-brand-add-card" role="button" tabIndex={0} onClick={() => setModal({ mode: "add" })}
             onKeyDown={(e) => e.key === "Enter" && setModal({ mode: "add" })}>
          <Plus />
          <div className="pa-brand-add-label">Tambah Brand</div>
          <div style={{ fontSize: 10.5, color: "inherit", textAlign: "center" }}>
            Buat konfigurasi AI untuk brand atau bisnis baru
          </div>
        </div>
      </div>

      <PaCard icon={<Lock />} title="Isolasi Percakapan Antar-Brand">
        <PaToggleRow
          label="Isolasi data per brand"
          desc="Percakapan dan lead dari brand berbeda tidak saling tercampur — agent brand A tidak bisa melihat percakapan brand B."
          checked={form.isolateBrand}
          onChange={(v) => setForm({ isolateBrand: v })}
        />
        <PaToggleRow
          label="Shared Knowledge Base"
          desc="Semua brand menggunakan knowledge base yang sama. Matikan untuk knowledge base terpisah per brand."
          checked={form.sharedKb}
          onChange={(v) => setForm({ sharedKb: v })}
        />
      </PaCard>

      {modal.mode !== "closed" && (
        <BrandModal brand={modal.mode === "edit" ? modal.brand : null} onClose={() => setModal({ mode: "closed" })} />
      )}
    </div>
  );
}
