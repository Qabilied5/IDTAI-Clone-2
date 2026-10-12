'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import type { Lead, LeadEditableFields, LeadKategori, LeadStatus, LeadSumber } from '@/types/lead';
import { KATEGORI_LABEL, STATUS_LABEL, SUMBER_INFO } from '@/lib/leads';
import LeadDetailBody from './LeadDetailBody';

/* ── Shell modal ──────────────────────────────────────────────── */
export function LeadModalShell({
  title, small, onClose, children, footer,
}: { title: ReactNode; small?: boolean; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="lp-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`lp-modal${small ? ' lp-modal-sm' : ''}`}>
        <div className="lp-modal-header">
          <div className="lp-modal-title">{title}</div>
          <button className="lp-modal-close" onClick={onClose} aria-label="Tutup"><i className="ti ti-x" /></button>
        </div>
        <div className="lp-modal-body">{children}</div>
        {footer && <div className="lp-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

/* ── Detail ───────────────────────────────────────────────────── */
export function LeadDetailModal({
  lead, onClose, onEdit, onWa,
}: { lead: Lead; onClose: () => void; onEdit: () => void; onWa: () => void }) {
  return (
    <LeadModalShell
      title={<><i className="ti ti-user-circle" /> {lead.nama}</>}
      onClose={onClose}
      footer={
        <>
          <button className="lp-btn-ghost" onClick={onClose}>Tutup</button>
          <Link className="lp-btn-ghost" href={`/kontak-leads/${lead.id}`}>Halaman penuh</Link>
          <button className="lp-btn-primary-sm" onClick={onEdit}><i className="ti ti-pencil" /> Edit</button>
          <button className="lp-btn-primary-sm" onClick={onWa}><i className="ti ti-brand-whatsapp" /> Hubungi via WA</button>
        </>
      }
    >
      <LeadDetailBody lead={lead} />
    </LeadModalShell>
  );
}

/* ── Edit (semua field, auto-sync ke Sheets) ──────────────────── */
export function EditLeadModal({
  lead, onClose, onSave,
}: { lead: Lead; onClose: () => void; onSave: (id: number, fields: LeadEditableFields) => void }) {
  const [f, setF] = useState({
    nama: lead.nama, perusahaan: lead.perusahaan, jabatan: lead.jabatan ?? '', email: lead.email,
    phone: lead.phone, kota: lead.kota, kategori: lead.kategori as LeadKategori, sumber: lead.sumber as LeadSumber,
    aksiSelanjutnya: lead.aksiSelanjutnya ?? '', tipeLayanan: lead.tipeLayanan ?? '',
    estimasiNominal: String(lead.estimasiNominal ?? ''),
  });
  const [err, setErr] = useState('');
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = () => {
    if (!f.nama.trim()) { setErr('Nama kontak wajib diisi'); return; }
    onSave(lead.id, {
      nama: f.nama.trim(), perusahaan: f.perusahaan.trim(), jabatan: f.jabatan.trim(), email: f.email.trim(),
      phone: f.phone.trim(), kota: f.kota.trim(), kategori: f.kategori, sumber: f.sumber,
      aksiSelanjutnya: f.aksiSelanjutnya.trim(), tipeLayanan: f.tipeLayanan.trim(), estimasiNominal: f.estimasiNominal.trim(),
    });
  };

  return (
    <LeadModalShell
      small
      title={<><i className="ti ti-pencil" /> Edit Lead</>}
      onClose={onClose}
      footer={
        <>
          <button className="lp-btn-ghost" onClick={onClose}>Batal</button>
          <button className="lp-btn-primary-sm" onClick={submit}><i className="ti ti-check" /> Simpan Perubahan</button>
        </>
      }
    >
      <label className="lp-import-label">Nama Kontak / PIC</label>
      <input className="lp-fd-input" value={f.nama} onChange={set('nama')} placeholder="Nama kontak" />

      <label className="lp-import-label" style={{ marginTop: 10 }}>Perusahaan</label>
      <input className="lp-fd-input" value={f.perusahaan} onChange={set('perusahaan')} placeholder="Nama perusahaan" />

      <label className="lp-import-label" style={{ marginTop: 10 }}>Jabatan</label>
      <input className="lp-fd-input" value={f.jabatan} onChange={set('jabatan')} placeholder="Jabatan" />

      <div className="lp-fd-2col">
        <div>
          <label className="lp-import-label">Email</label>
          <input className="lp-fd-input" value={f.email} onChange={set('email')} placeholder="Email" />
        </div>
        <div>
          <label className="lp-import-label">No. HP / WA</label>
          <input className="lp-fd-input" value={f.phone} onChange={set('phone')} placeholder="8123xxxxxxx" />
        </div>
      </div>

      <label className="lp-import-label" style={{ marginTop: 10 }}>Kota</label>
      <input className="lp-fd-input" value={f.kota} onChange={set('kota')} placeholder="Kota" />

      <div className="lp-fd-2col">
        <div>
          <label className="lp-import-label">Status Lead (Kategori)</label>
          <select className="lp-fd-select" value={f.kategori} onChange={set('kategori')}>
            {(Object.keys(KATEGORI_LABEL) as LeadKategori[]).map((k) => <option key={k} value={k}>{KATEGORI_LABEL[k]}</option>)}
          </select>
        </div>
        <div>
          <label className="lp-import-label">Sumber Lead</label>
          <select className="lp-fd-select" value={f.sumber} onChange={set('sumber')}>
            {(Object.keys(SUMBER_INFO) as LeadSumber[]).map((k) => <option key={k} value={k}>{SUMBER_INFO[k].name}</option>)}
          </select>
        </div>
      </div>

      <label className="lp-import-label" style={{ marginTop: 10 }}>Aksi Selanjutnya</label>
      <input className="lp-fd-input" value={f.aksiSelanjutnya} onChange={set('aksiSelanjutnya')} placeholder="Mis. Kirim penawaran harga" />

      <div className="lp-fd-2col">
        <div>
          <label className="lp-import-label">Produk / Layanan</label>
          <input className="lp-fd-input" value={f.tipeLayanan} onChange={set('tipeLayanan')} placeholder="Produk/layanan yang diminati" />
        </div>
        <div>
          <label className="lp-import-label">Estimasi Nominal</label>
          <input className="lp-fd-input" type="number" value={f.estimasiNominal} onChange={set('estimasiNominal')} placeholder="0" />
        </div>
      </div>

      {err && <div className="lp-import-error">{err}</div>}
      <div className="lp-import-hint" style={{ marginTop: 10 }}>
        Perubahan di sini otomatis tersinkron ke baris yang sama di spreadsheet (kalau sudah terhubung ke Google Sheets).
      </div>
    </LeadModalShell>
  );
}

/* ── Update status ────────────────────────────────────────────── */
export function StatusModal({
  lead, onClose, onSave,
}: { lead: Lead; onClose: () => void; onSave: (id: number, status: LeadStatus) => void }) {
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [note, setNote] = useState('');

  return (
    <LeadModalShell
      small
      title={<><i className="ti ti-edit-circle" /> Update Status Follow-up</>}
      onClose={onClose}
      footer={
        <>
          <button className="lp-btn-ghost" onClick={onClose}>Batal</button>
          <button className="lp-btn-primary-sm" onClick={() => onSave(lead.id, status)}><i className="ti ti-check" /> Simpan</button>
        </>
      }
    >
      <label className="lp-import-label">Status</label>
      <select className="lp-fd-select" value={status} onChange={(e) => setStatus(e.target.value as LeadStatus)}>
        {(Object.keys(STATUS_LABEL) as LeadStatus[]).map((k) => <option key={k} value={k}>{STATUS_LABEL[k]}</option>)}
      </select>
      <label className="lp-import-label" style={{ marginTop: 10 }}>Catatan (opsional)</label>
      <textarea className="lp-fd-textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Tambahkan catatan follow-up…" />
    </LeadModalShell>
  );
}

/* ── Cara kerja AI Leads ──────────────────────────────────────── */
const HOW_STEPS: [string, string][] = [
  ['AI memantau semua interaksi kontak secara real-time', 'Kontak langsung, pesan masuk, permintaan/booking, dan kunjungan profil dianalisis otomatis untuk menilai niat setiap prospek.'],
  ['AI memberi skor HOT / WARM / COLD', 'Setiap kontak diberi skor berdasarkan kecocokan produk/layanan, kecepatan respons, dan riwayat interaksi serupa.'],
  ['Kontak prioritas direkomendasikan ke Anda', 'Kontak dengan skor tertinggi muncul di banner "Rekomendasi AI" agar Anda bisa follow-up lebih dulu.'],
  ['AI menyusun pesan follow-up yang dipersonalisasi', 'Dengan satu klik, AI membuat draft pesan follow-up sesuai konteks kontak — nama, sumber interaksi, dan skor lead — siap Anda edit dan kirim.'],
];

export function HowItWorksModal({ onClose, onOpenRecommendation }: { onClose: () => void; onOpenRecommendation: () => void }) {
  return (
    <LeadModalShell
      title={<><i className="ti ti-info-circle" style={{ color: 'var(--red)' }} /> Cara Kerja AI Leads</>}
      onClose={onClose}
      footer={
        <>
          <button className="lp-btn-ghost" onClick={onClose}>Tutup</button>
          <button className="lp-btn-primary-sm" onClick={onOpenRecommendation}><i className="ti ti-sparkles" /> Lihat Rekomendasi AI</button>
        </>
      }
    >
      <div className="lp-howit-steps">
        {HOW_STEPS.map(([title, desc], i) => (
          <div className="lp-howit-step" key={title}>
            <div className="lp-howit-num">{i + 1}</div>
            <div className="lp-howit-text">
              <div className="lp-howit-title">{title}</div>
              <div className="lp-howit-desc">{desc}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="lp-howit-note">
        <i className="ti ti-bulb" />
        <span>Tips: kontak dengan skor 🔥 HOT punya kemungkinan tertinggi untuk merespons dalam 1 jam pertama — prioritaskan follow-up secepatnya.</span>
      </div>
    </LeadModalShell>
  );
}