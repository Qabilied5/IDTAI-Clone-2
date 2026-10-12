'use client';

import Link from 'next/link';
import { useState } from 'react';
import './leads.css';
import { SCORE_ICON, STATUS_CLASS, STATUS_ICON, STATUS_LABEL, getAiScore, initials } from '@/lib/leads';
import { useLeadToast, useLeads } from '@/hooks/useLeads';
import LeadDetailBody from './LeadDetailBody';
import { EditLeadModal, StatusModal } from './LeadModals';

export default function LeadDetailContent({ leadId }: { leadId: number }) {
  const { toast, notify } = useLeadToast();
  const { leads, source, loading, updateLead, updateStatus, contactWa } = useLeads(notify);
  const [editOpen, setEditOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const lead = leads.find((l) => l.id === leadId);
  const back = (
    <Link href="/kontak-leads" className="lp-btn-ghost lp-back-link">
      <i className="ti ti-arrow-left" /> Kembali ke Kontak &amp; Leads
    </Link>
  );

  if (loading) {
    return <div className="lp-page"><div className="lp-loading"><i className="ti ti-loader-2 lp-spin" /> Memuat data lead…</div></div>;
  }
  if (!lead) {
    return (
      <div className="lp-page">
        {back}
        <div className="lp-empty"><i className="ti ti-user-off" /><div>Lead tidak ditemukan</div><span>Data mungkin belum dimuat atau sudah dihapus dari spreadsheet.</span></div>
      </div>
    );
  }

  const ai = getAiScore(lead, source);

  return (
    <div className="lp-page">
      <div>{back}</div>

      <div className="lp-section">
        <div className="lp-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="lp-airec-avatar" style={{ width: 44, height: 44, fontSize: 15 }}>{initials(lead.nama)}</div>
            <div>
              <div className="lp-title">{lead.nama}</div>
              <div className="lp-subtitle">{lead.perusahaan}</div>
            </div>
          </div>
          <div className="lp-header-actions">
            <button className={`lp-status-followup ${STATUS_CLASS[lead.status]}`} onClick={() => setStatusOpen(true)}>
              <i className={`ti ${STATUS_ICON[lead.status]}`} />{STATUS_LABEL[lead.status]}
            </button>
            <button className="lp-btn-ghost" onClick={() => setEditOpen(true)}><i className="ti ti-pencil" /> Edit</button>
            <button className="lp-btn-wa" onClick={() => contactWa(lead)}><i className="ti ti-brand-whatsapp" /> Hubungi via WA</button>
          </div>
        </div>

        <div className="lp-ai-score-cell" style={{ margin: '14px 0' }}>
          <span className={`lp-score-badge ${ai.score.toLowerCase()}`}>{SCORE_ICON[ai.score]} {ai.score}</span>
          <div className="lp-score-reason" style={{ maxWidth: 'none' }}>{ai.reason}</div>
        </div>

        <LeadDetailBody lead={lead} />
      </div>

      {editOpen && (
        <EditLeadModal
          key={lead.id}
          lead={lead}
          onClose={() => setEditOpen(false)}
          onSave={(id, fields) => { updateLead(id, fields); setEditOpen(false); notify('Data lead berhasil diperbarui', 'success'); }}
        />
      )}
      {statusOpen && (
        <StatusModal
          key={lead.id}
          lead={lead}
          onClose={() => setStatusOpen(false)}
          onSave={(id, status) => { updateStatus(id, status); setStatusOpen(false); notify('Status berhasil diperbarui', 'success'); }}
        />
      )}

      {toast && (
        <div className={`lp-toast ${toast.type}`}>
          <i className={`ti ${toast.type === 'success' ? 'ti-circle-check' : 'ti-info-circle'}`} /> {toast.msg}
        </div>
      )}
    </div>
  );
}