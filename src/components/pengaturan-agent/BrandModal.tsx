"use client";

import { useEffect, useState } from "react";
import { Check, Eye, Globe, Mail, Palette, Phone, Save, Store, Trash2, Type, X } from "lucide-react";

import { usePengaturanAgent } from "@/hooks/usePengaturanAgent";
import { autoAbbr, makeBrand, type Brand, type ToneId } from "@/types/pengaturan-agent";

const INDUSTRIES = [
  "Platform Utama", "Industri Mesin", "Bahan Kimia", "Konstruksi & Bangunan", "Elektronik & Teknologi",
  "Makanan & Minuman", "Tekstil & Garmen", "Otomotif & Spare Part", "Kesehatan & Farmasi",
  "Pertanian & Perkebunan", "Energi & Tambang", "Logistik & Distribusi", "Retail & E-Commerce",
  "Jasa & Konsultan", "Lainnya",
];
const SWATCHES: { color: string; title: string }[] = [
  { color: "#c8102e", title: "Merah" }, { color: "#1d4ed8", title: "Biru" }, { color: "#15803d", title: "Hijau" },
  { color: "#7c3aed", title: "Ungu" }, { color: "#b45309", title: "Oranye" }, { color: "#0e7490", title: "Teal" },
  { color: "#be185d", title: "Pink" }, { color: "#374151", title: "Abu" },
];

/** Modal tambah / edit brand. `brand` = null → mode tambah. */
export function BrandModal({ brand, onClose }: { brand: Brand | null; onClose: () => void }) {
  const { form, setForm, toast } = usePengaturanAgent();
  const [draft, setDraft] = useState<Brand>(() => brand ?? makeBrand({ name: "" }, 0));
  const [abbrManual, setAbbrManual] = useState(!!brand);
  const [saving, setSaving] = useState(false);
  const patch = (p: Partial<Brand>) => setDraft((d) => ({ ...d, ...p }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const previewName = draft.name.trim() || "Nama Brand";
  const previewAbbr = (draft.abbr || autoAbbr(previewName)).toUpperCase().slice(0, 3);
  const toneLabel = draft.tone.charAt(0).toUpperCase() + draft.tone.slice(1);

  const submit = () => {
    const name = draft.name.trim();
    if (!name) return toast("Nama brand wajib diisi", "error");
    if (!draft.cat) return toast("Kategori industri wajib diisi", "error");
    setSaving(true);

    const clean: Brand = { ...draft, name, abbr: (draft.abbr.trim() || autoAbbr(name)).toUpperCase().slice(0, 3) };
    if (brand) {
      setForm({ brands: form.brands.map((b) => (b.id === brand.id ? { ...b, ...clean, id: b.id, active: b.active } : b)) });
      toast(`Brand "${name}" berhasil diperbarui`, "success");
    } else {
      const id = Math.max(0, ...form.brands.map((b) => b.id)) + 1;
      setForm({ brands: [...form.brands, { ...clean, id, conv: 0, agents: 0, active: form.brands.length === 0 }] });
      toast(`Brand "${name}" berhasil ditambahkan`, "success");
    }
    onClose();
  };

  const remove = () => {
    if (!brand) return;
    if (form.brands.length <= 1) return toast("Minimal harus ada satu brand", "error");
    if (!window.confirm(`Hapus brand "${brand.name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    const rest = form.brands.filter((b) => b.id !== brand.id);
    if (!rest.some((b) => b.active)) rest[0] = { ...rest[0], active: true }; // pastikan selalu ada brand aktif
    setForm({ brands: rest });
    toast(`Brand "${brand.name}" dihapus`);
    onClose();
  };

  return (
    <div className="pa-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="pa-modal-brand-title">
      <div className="pa-modal pa-modal-brand-wide">
        <div className="pa-modal-header">
          <div className="pa-modal-title">
            <Store size={16} style={{ color: "var(--pa-red)" }} />
            <span id="pa-modal-brand-title">{brand ? "Edit Brand" : "Tambah Brand Baru"}</span>
          </div>
          <button type="button" className="pa-modal-close" onClick={onClose} aria-label="Tutup"><X /></button>
        </div>

        <div className="pa-modal-brand-layout">
          {/* KIRI: form */}
          <div className="pa-modal-body pa-brand-form-col">
            <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
              <div className="pa-brand-section-label">Identitas Brand</div>

              <div className="pa-field">
                <label className="pa-label" htmlFor="pa-brand-name">Nama Brand <span className="pa-label-hint">(wajib)</span></label>
                <input id="pa-brand-name" className="pa-input" type="text" required
                       placeholder="Mis. Indotrading Kimia, TechMart, GreenBuild..."
                       value={draft.name}
                       onChange={(e) => patch({ name: e.target.value, ...(abbrManual ? {} : { abbr: autoAbbr(e.target.value) }) })} />
              </div>

              <div className="pa-form-2col">
                <div className="pa-field">
                  <label className="pa-label" htmlFor="pa-brand-industry">Kategori Industri <span className="pa-label-hint">(wajib)</span></label>
                  <select id="pa-brand-industry" className="pa-select" required value={draft.cat} onChange={(e) => patch({ cat: e.target.value })}>
                    <option value="">— Pilih kategori —</option>
                    {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div className="pa-field">
                  <label className="pa-label" htmlFor="pa-brand-abbr">Singkatan <span className="pa-label-hint">(maks 3 huruf)</span></label>
                  <input id="pa-brand-abbr" className="pa-input" type="text" maxLength={3} placeholder="IT"
                         style={{ textTransform: "uppercase" }} value={draft.abbr}
                         onChange={(e) => { setAbbrManual(true); patch({ abbr: e.target.value }); }} />
                  <div className="pa-helper">Tampil pada avatar brand.</div>
                </div>
              </div>

              <div className="pa-field">
                <label className="pa-label">Warna Brand</label>
                <div className="pa-color-row">
                  <div className="pa-color-swatches">
                    {SWATCHES.map((s) => (
                      <button key={s.color} type="button" title={s.title} aria-label={s.title}
                              className={`pa-color-swatch${draft.color.toLowerCase() === s.color ? " selected" : ""}`}
                              style={{ background: s.color }} onClick={() => patch({ color: s.color })} />
                    ))}
                  </div>
                  <label className="pa-color-custom-wrap" title="Pilih warna kustom">
                    <Palette size={14} />
                    <input type="color" value={draft.color} onChange={(e) => patch({ color: e.target.value })} />
                  </label>
                </div>
              </div>

              <div className="pa-field">
                <label className="pa-label" htmlFor="pa-brand-desc">Deskripsi Brand</label>
                <textarea id="pa-brand-desc" className="pa-textarea" style={{ minHeight: 62 }}
                          placeholder="Jelaskan bisnis atau produk utama brand ini secara singkat..."
                          value={draft.desc} onChange={(e) => patch({ desc: e.target.value })} />
              </div>

              <div className="pa-brand-section-label" style={{ marginTop: 4 }}>Kontak & Informasi</div>

              <div className="pa-form-2col">
                <div className="pa-field">
                  <label className="pa-label" htmlFor="pa-brand-website">Website</label>
                  <div className="pa-input-prefix">
                    <span className="pa-input-prefix-label"><Globe size={12} /></span>
                    <input id="pa-brand-website" type="url" placeholder="https://brand.com" value={draft.website} onChange={(e) => patch({ website: e.target.value })} />
                  </div>
                </div>
                <div className="pa-field">
                  <label className="pa-label" htmlFor="pa-brand-phone">No. Telepon / WhatsApp</label>
                  <div className="pa-input-prefix">
                    <span className="pa-input-prefix-label"><Phone size={12} /></span>
                    <input id="pa-brand-phone" type="tel" placeholder="0812-xxxx-xxxx" value={draft.phone} onChange={(e) => patch({ phone: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="pa-form-2col">
                <div className="pa-field">
                  <label className="pa-label" htmlFor="pa-brand-email">Email Bisnis</label>
                  <div className="pa-input-prefix">
                    <span className="pa-input-prefix-label"><Mail size={12} /></span>
                    <input id="pa-brand-email" type="email" placeholder="cs@brand.com" value={draft.email} onChange={(e) => patch({ email: e.target.value })} />
                  </div>
                </div>
                <div className="pa-field">
                  <label className="pa-label" htmlFor="pa-brand-tone">Tone AI untuk Brand</label>
                  <select id="pa-brand-tone" className="pa-select" value={draft.tone} onChange={(e) => patch({ tone: e.target.value as ToneId })}>
                    <option value="formal">Formal — Profesional & sopan</option>
                    <option value="santai">Santai — Hangat & akrab</option>
                    <option value="industri">Industri — Teknikal & to the point</option>
                    <option value="custom">Custom — Instruksi sendiri</option>
                  </select>
                </div>
              </div>

              <div className="pa-field">
                <label className="pa-label" htmlFor="pa-brand-address">Alamat Bisnis</label>
                <input id="pa-brand-address" className="pa-input" type="text" placeholder="Jl. Sudirman No. 1, Jakarta Selatan..."
                       value={draft.address} onChange={(e) => patch({ address: e.target.value })} />
              </div>

              <div className="pa-field">
                <label className="pa-label" htmlFor="pa-brand-greeting">Pesan Pembuka AI <span className="pa-label-hint">(opsional)</span></label>
                <textarea id="pa-brand-greeting" className="pa-textarea" style={{ minHeight: 54 }}
                          placeholder="Halo! Selamat datang di [nama brand]. Ada yang bisa kami bantu?"
                          value={draft.greeting} onChange={(e) => patch({ greeting: e.target.value })} />
                <div className="pa-helper">Kosongkan untuk menggunakan pesan pembuka default.</div>
              </div>
            </form>
          </div>

          {/* KANAN: preview */}
          <div className="pa-brand-preview-col">
            <div className="pa-brand-preview-label"><Eye size={12} /> Preview Kartu Brand</div>
            <div className="pa-brand-card active-brand pa-brand-preview-card" style={{ pointerEvents: "none", cursor: "default", maxWidth: 220 }}>
              <div className="pa-brand-card-top" style={{ background: draft.color }} />
              <div className="pa-brand-card-body">
                <div className="pa-brand-card-head">
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <div className="pa-brand-logo" style={{ background: draft.color }}>{previewAbbr}</div>
                    <div>
                      <div className="pa-brand-name">{previewName}</div>
                      <div className="pa-brand-cat">{draft.cat || "Kategori Bisnis"}</div>
                    </div>
                  </div>
                </div>
                <div className="pa-brand-stats">
                  <div className="pa-brand-stat"><div className="pa-brand-stat-val">{draft.conv}</div><div className="pa-brand-stat-lbl">Percakapan</div></div>
                  <div className="pa-brand-stat"><div className="pa-brand-stat-val">{draft.agents}</div><div className="pa-brand-stat-lbl">Agent</div></div>
                </div>
              </div>
              <div className="pa-brand-preview-tone-row">
                <Type size={11} style={{ color: "var(--pa-gray-400)" }} />
                <span style={{ fontSize: 10.5, color: "var(--pa-gray-400)" }}>Tone:</span>
                <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--pa-gray-600)" }}>{toneLabel}</span>
              </div>
            </div>

            <div className="pa-brand-preview-tips">
              {["Brand tampil di grid konfigurasi", "Bisa diaktifkan sebagai brand utama", "Tone AI terpisah per brand"].map((t) => (
                <div key={t} className="pa-brand-tip"><Check style={{ color: "var(--pa-green)" }} /> {t}</div>
              ))}
            </div>
          </div>
        </div>

        <div className="pa-modal-footer pa-brand-footer">
          <div>
            {brand && (
              <button type="button" className="pa-btn pa-btn-danger" onClick={remove}><Trash2 /> Hapus Brand</button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
            <button type="button" className="pa-btn pa-btn-ghost" onClick={onClose}>Batal</button>
            <button type="button" className="pa-btn pa-btn-primary" onClick={submit} disabled={saving}>
              {brand ? <><Save /> Simpan Perubahan</> : <><Store /> Tambah Brand</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
