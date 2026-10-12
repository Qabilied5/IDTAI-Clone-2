'use client';

import { useEffect, useState } from 'react';
import type { AiScore, Lead } from '@/types/lead';
import { SCORE_ICON, SUMBER_INFO, generateFallbackMessage, initials } from '@/lib/leads';
import { LeadModalShell } from './LeadModals';

/* ── Follow-up AI (pesan dibuat Ollama lewat /api/followup/generate) ─ */
export function AiFollowupModal({
  lead, ai, onClose, onSend,
}: { lead: Lead; ai: AiScore; onClose: () => void; onSend: (message: string) => Promise<void> }) {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/followup/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead: {
              id: lead.id, nama: lead.nama, perusahaan: lead.perusahaan, kota: lead.kota,
              sumber: lead.sumber, status: lead.status, aiScore: ai.score,
            },
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok || !data.message) throw new Error('generate gagal');
        if (!cancelled) setMessage(data.message);
      } catch {
        if (!cancelled) setMessage(generateFallbackMessage(lead));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);

  const send = async () => {
    setSending(true);
    await onSend(message);
    setSending(false);
  };

  return (
    <LeadModalShell
      title={<><i className="ti ti-brain" style={{ color: 'var(--red)' }} /> AI Follow-up — {lead.nama}</>}
      onClose={onClose}
      footer={
        <>
          <button className="lp-btn-ghost" onClick={onClose}>Batal</button>
          {!loading && (
            <button className="lp-btn-ai-send" onClick={send} disabled={sending || !message.trim()}>
              <i className="ti ti-brand-whatsapp" /> {sending ? 'Mengirim…' : 'Approve & Kirim WA'}
            </button>
          )}
        </>
      }
    >
      <div className="lp-aifollowup-context">
        <span className="lp-aifollowup-context-pill"><i className="ti ti-user" /> {lead.nama}</span>
        <span className="lp-aifollowup-context-pill"><i className="ti ti-building-store" /> {lead.perusahaan}</span>
        <span className="lp-aifollowup-context-pill"><i className="ti ti-map-pin" /> {lead.kota}</span>
        <span className="lp-aifollowup-context-pill">{SCORE_ICON[ai.score]} AI Score: {ai.score}</span>
        <span className="lp-aifollowup-context-pill"><i className="ti ti-antenna" style={{ color: '#6b7280' }} /> Sumber: {SUMBER_INFO[lead.sumber].name}</span>
      </div>

      {loading ? (
        <div className="lp-aifollowup-loading">
          <span className="lp-ai-spinner" />
          <span>AI sedang membaca konteks lead dan menyusun pesan…</span>
        </div>
      ) : (
        <div>
          <div className="lp-aifollowup-label">
            <i className="ti ti-sparkles" style={{ color: 'var(--red)' }} /> Pesan WA yang dipersonalisasi AI:
          </div>
          <textarea
            className="lp-fd-textarea lp-aifollowup-textarea"
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <div className="lp-aifollowup-note">
            <i className="ti ti-info-circle" />
            Anda bisa edit sebelum mengirim. AI menyesuaikan pesan dengan nama, perusahaan, produk, dan skor lead.
          </div>
        </div>
      )}
    </LeadModalShell>
  );
}

/* ── Rekomendasi AI ───────────────────────────────────────────── */
export function AiRecommendationModal({
  items, onClose, onContact,
}: { items: { lead: Lead; ai: AiScore }[]; onClose: () => void; onContact: (lead: Lead) => void }) {
  return (
    <div className="lp-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="lp-modal lp-modal-lg">
        <div className="lp-modal-header">
          <div className="lp-modal-title"><i className="ti ti-brain" style={{ color: 'var(--red)' }} /> Rekomendasi AI</div>
          <button className="lp-modal-close" onClick={onClose} aria-label="Tutup"><i className="ti ti-x" /></button>
        </div>
        <div className="lp-modal-body">
          <div className="lp-airec-summary">
            <i className="ti ti-sparkles" />
            <span>AI menemukan <strong>{items.length}</strong> kontak dengan potensi tinggi yang belum sempat Anda follow-up.</span>
          </div>
          <div className="lp-airec-list">
            {items.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 10px', color: '#9ca3af', fontSize: 12 }}>
                <i className="ti ti-mood-empty" style={{ fontSize: 24, display: 'block', marginBottom: 6 }} />
                Belum ada rekomendasi baru saat ini.
              </div>
            )}
            {items.map(({ lead, ai }) => {
              const handled = lead.status !== 'belum';
              return (
                <div className="lp-airec-item" key={lead.id}>
                  <div className="lp-airec-avatar">{initials(lead.nama)}</div>
                  <div className="lp-airec-info">
                    <div className="lp-airec-name">{lead.nama} <span style={{ color: '#9ca3af', fontWeight: 500 }}>— {lead.kota}</span></div>
                    <div className="lp-airec-company">{lead.perusahaan}</div>
                    <div className="lp-airec-reason"><i className="ti ti-sparkles" style={{ fontSize: 9 }} />{ai.reason}</div>
                  </div>
                  <span className={`lp-airec-score ${ai.score.toLowerCase()}`}>{SCORE_ICON[ai.score]} {ai.score}</span>
                  <button className="lp-airec-action" disabled={handled} onClick={() => onContact(lead)}>
                    <i className={`ti ${handled ? 'ti-circle-check' : 'ti-brand-whatsapp'}`} />
                    {handled ? 'Dihubungi' : 'Hubungi'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        <div className="lp-modal-footer">
          <button className="lp-btn-ghost" onClick={onClose}>Tutup</button>
        </div>
      </div>
    </div>
  );
}