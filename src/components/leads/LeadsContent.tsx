'use client';

import { useMemo, useState } from 'react';
import './leads.css';
import type {
  AdvancedFilters, AiScore, Lead, LeadDateRange, LeadEditableFields, LeadNlFilter, LeadStatus,
} from '@/types/lead';
import { DEFAULT_ADVANCED, SCORE_RANK, filterLeads, getAiScore, toWaNumber } from '@/lib/leads';
import { useChatProvider, useLeadToast, useLeads } from '@/hooks/useLeads';
import CategoryCards, { type KatKey } from './CategoryCards';
import AiBanner from './AiBanner';
import LeadsToolbar from './LeadsToolbar';
import LeadsTable from './LeadsTable';
import ImportModal from './ImportModal';
import { AiFollowupModal, AiRecommendationModal } from './AiModals';
import { EditLeadModal, HowItWorksModal, LeadDetailModal, StatusModal } from './LeadModals';

const PER_PAGE = 10;

interface StartChatResult { id: number; ok?: boolean; reason?: string }

export default function LeadsContent() {
  const { toast, notify } = useLeadToast();
  const {
    leads, source, loading, updateStatus, updateLead, contactWa,
    importFromUrl, importFromCsv, clearConnection,
  } = useLeads(notify);
  const { provider, refresh: refreshProvider } = useChatProvider();

  // filter
  const [kat, setKat] = useState<KatKey>('semua');
  const [query, setQuery] = useState('');
  const [date, setDate] = useState<LeadDateRange>('semua');
  const [nl, setNl] = useState<LeadNlFilter | null>(null);
  const [adv, setAdv] = useState<AdvancedFilters>(DEFAULT_ADVANCED);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // modal
  const [detailId, setDetailId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [statusId, setStatusId] = useState<number | null>(null);
  const [followupId, setFollowupId] = useState<number | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const [recIds, setRecIds] = useState<number[] | null>(null);
  const [chatBusy, setChatBusy] = useState(false);

  /* ── turunan ── */
  const aiScores = useMemo(() => new Map<number, AiScore>(leads.map((l) => [l.id, getAiScore(l, source)])), [leads, source]);

  const counts = useMemo(() => {
    const c: Record<KatKey, number> = { semua: leads.length, real: 0, potensi: 0, belum: 0 };
    leads.forEach((l) => { c[l.kategori]++; });
    return c;
  }, [leads]);

  const filtered = useMemo(
    () => filterLeads(leads, { kat, query, date, nl, adv }, source),
    [leads, kat, query, date, nl, adv, source],
  );

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, pages);
  const rows = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const recommended = useMemo(
    () => leads
      .filter((l) => l.status === 'belum' && aiScores.get(l.id)?.score !== 'COLD')
      .sort((a, b) => SCORE_RANK[aiScores.get(a.id)!.score] - SCORE_RANK[aiScores.get(b.id)!.score]),
    [leads, aiScores],
  );

  const byId = (id: number | null) => (id == null ? undefined : leads.find((l) => l.id === id));
  const detailLead = byId(detailId);
  const editLead = byId(editId);
  const statusLead = byId(statusId);
  const followupLead = byId(followupId);

  const resetPage = () => setPage(1);

  /* ── aksi ── */
  const toggleRow = (id: number) =>
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = (checked: boolean) =>
    setSelected((prev) => { const n = new Set(prev); rows.forEach((r) => (checked ? n.add(r.id) : n.delete(r.id))); return n; });

  const openRecommendation = () => {
    setHowOpen(false);
    setRecIds(recommended.slice(0, 6).map((l) => l.id));
  };

  const saveEdit = (id: number, fields: LeadEditableFields) => {
    updateLead(id, fields);
    setEditId(null);
    notify('Data lead berhasil diperbarui', 'success');
  };

  const saveStatus = (id: number, status: LeadStatus) => {
    updateStatus(id, status);
    setStatusId(null);
    notify('Status berhasil diperbarui', 'success');
  };

  const sendFollowup = async (lead: Lead, message: string) => {
    const number = toWaNumber(lead.phone);
    let sent = false;

    if (provider === 'whatsapp') {
      try {
        const res = await fetch('/api/followup/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lead: { id: lead.id, nama: lead.nama }, message, chatId: number, mode: 'whatsapp' }),
        });
        const data = await res.json();
        sent = res.ok && data.ok !== false;
      } catch { sent = false; }
    }
    // WABA tidak aktif / gagal (mis. window 24 jam tertutup) → buka wa.me dengan pesan terisi
    if (!sent) window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');

    if (lead.status === 'belum') updateStatus(lead.id, 'dihubungi');
    setFollowupId(null);
    notify(
      sent ? `Pesan AI terkirim ke ${lead.nama} via WhatsApp Business ✓` : `Pesan AI untuk ${lead.nama} siap dikirim via WhatsApp ✓`,
      'success',
    );
  };

  const startAiChat = async () => {
    const targets = leads.filter((l) => l.status === 'belum' && l.phone);
    if (targets.length === 0) { notify('Tidak ada lead "Belum dihubungi" yang punya nomor HP.', 'error'); return; }

    setChatBusy(true);
    try {
      const active = await refreshProvider();
      if (!active) {
        notify('Tidak ada provider chat aktif. Hubungkan WhatsApp Business API atau Telegram di halaman Integrasi.', 'error');
        return;
      }
      notify(`AI mulai menghubungi ${targets.length} lead via ${active === 'whatsapp' ? 'WhatsApp Business' : 'Telegram'}…`, 'success');

      const res = await fetch('/api/leads/start-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: active,
          leads: targets.map(({ id, nama, perusahaan, phone }) => ({ id, nama, perusahaan, phone })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.error || `Request gagal (${res.status})`);

      let started = 0, notFound = 0, failed = 0;
      for (const r of (data.results ?? []) as StartChatResult[]) {
        if (r.ok) { updateStatus(r.id, 'dihubungi'); started++; }
        else if (r.reason === 'not_found') { updateStatus(r.id, 'nomor_tidak_ditemukan'); notFound++; }
        else if (r.reason === 'send_error' || r.reason === 'error') failed++;
      }

      let msg = `✓ AI berhasil menyapa ${started} kontak via ${data.provider === 'whatsapp' ? 'WhatsApp Business' : 'Telegram'}.`;
      if (notFound) msg += ` ${notFound} nomor tidak ditemukan.`;
      if (failed) msg += ` ${failed} gagal dikirim.`;
      notify(msg, 'success');
    } catch (err) {
      notify('Gagal menghubungi backend AI: ' + (err instanceof Error ? err.message : String(err)), 'error');
    } finally {
      setChatBusy(false);
    }
  };

  const recItems = (recIds ?? [])
    .map((id) => leads.find((l) => l.id === id))
    .filter((l): l is Lead => !!l)
    .map((lead) => ({ lead, ai: aiScores.get(lead.id) ?? { score: 'WARM' as const, reason: '—' } }));

  return (
    <div className="lp-page">
      {/* Header */}
      <div className="lp-header">
        <div>
          <div className="lp-title">Kontak &amp; Leads</div>
          <div className="lp-subtitle">Pantau, kelola, dan follow-up semua kontak &amp; prospek Anda dalam satu tempat</div>
        </div>
        <div className="lp-header-actions">
          <button className="lp-import-excel" onClick={() => setImportOpen(true)}>
            <i className="ti ti-file-spreadsheet" /> Import Excel / Spreadsheets
          </button>
          <button
            className="lp-import-excel"
            onClick={startAiChat}
            disabled={chatBusy}
            title="AI menghubungi lead yang belum dihubungi lewat WhatsApp/Telegram, berdasarkan nomor HP di data"
          >
            <i className={`ti ${chatBusy ? 'ti-loader-2 lp-spin' : 'ti-robot'}`} /> {chatBusy ? 'Menghubungi…' : 'Mulai Chat AI'}
          </button>
        </div>
      </div>

      {/* Info bar */}
      <div className="lp-info-bar">
        <div className="lp-ai-pulse-badge">
          <span className="lp-pulse-dot" />
          <i className="ti ti-brain" />
          AI sedang memantau {leads.length} kontak aktif
        </div>
      </div>

      <CategoryCards counts={counts} active={kat} onSelect={(k) => { setKat(k); resetPage(); }} />

      <AiBanner count={recommended.length} onOpenRecommendation={openRecommendation} onOpenHow={() => setHowOpen(true)} />

      <LeadsToolbar
        query={query} onQuery={(v) => { setQuery(v); resetPage(); }}
        date={date} onDate={(v) => { setDate(v); resetPage(); }}
        nl={nl} onNl={(v) => { setNl(v); resetPage(); }}
        adv={adv} onApplyAdv={(v) => { setAdv(v); resetPage(); }}
        drawerOpen={drawerOpen} onToggleDrawer={() => setDrawerOpen((o) => !o)}
      />

      <LeadsTable
        rows={rows} loading={loading} source={source} aiScores={aiScores}
        selected={selected} onToggle={toggleRow} onToggleAll={toggleAll}
        total={filtered.length} page={safePage} pages={pages} perPage={PER_PAGE} onPage={setPage}
        onStatus={setStatusId} onWa={contactWa} onMore={setDetailId} onAiFollowup={setFollowupId}
      />

      {/* Modals */}
      {detailLead && (
        <LeadDetailModal
          lead={detailLead}
          onClose={() => setDetailId(null)}
          onEdit={() => { setEditId(detailLead.id); setDetailId(null); }}
          onWa={() => contactWa(detailLead)}
        />
      )}
      {editLead && <EditLeadModal key={editLead.id} lead={editLead} onClose={() => setEditId(null)} onSave={saveEdit} />}
      {statusLead && <StatusModal key={statusLead.id} lead={statusLead} onClose={() => setStatusId(null)} onSave={saveStatus} />}
      {followupLead && (
        <AiFollowupModal
          key={followupLead.id}
          lead={followupLead}
          ai={aiScores.get(followupLead.id) ?? { score: 'WARM', reason: '—' }}
          onClose={() => setFollowupId(null)}
          onSend={(msg) => sendFollowup(followupLead, msg)}
        />
      )}
      {importOpen && (
        <ImportModal
          onClose={() => setImportOpen(false)}
          onImportUrl={async (u) => { const r = await importFromUrl(u); if (r.ok) setPage(1); return r; }}
          onImportCsv={async (f) => { const r = await importFromCsv(f); if (r.ok) setPage(1); return r; }}
          onClear={clearConnection}
        />
      )}
      {howOpen && <HowItWorksModal onClose={() => setHowOpen(false)} onOpenRecommendation={openRecommendation} />}
      {recIds && <AiRecommendationModal items={recItems} onClose={() => setRecIds(null)} onContact={contactWa} />}

      {toast && (
        <div className={`lp-toast ${toast.type}`}>
          <i className={`ti ${toast.type === 'success' ? 'ti-circle-check' : 'ti-info-circle'}`} /> {toast.msg}
        </div>
      )}
    </div>
  );
}