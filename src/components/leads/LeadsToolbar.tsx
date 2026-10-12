'use client';

import { useState } from 'react';
import type {
  AdvancedFilters, AiScoreLevel, LeadDateRange, LeadKategori, LeadNlFilter, LeadSortKey, LeadSumber,
} from '@/types/lead';
import { KATEGORI_LABEL, SUMBER_INFO } from '@/lib/leads';

const NL_PILLS: { key: LeadNlFilter; icon: string; label: string }[] = [
  { key: 'belum-3-hari', icon: 'ti-clock', label: 'Belum dihubungi 3 hari' },
  { key: 'real-belum-followup', icon: 'ti-circle-check', label: 'Real lead belum follow-up' },
  { key: 'score-hot', icon: 'ti-flame', label: 'Score HOT hari ini' },
  { key: 'pesan-belum-dibalas', icon: 'ti-message-2', label: 'Pesan belum dibalas' },
];

interface Props {
  query: string;
  onQuery: (v: string) => void;
  date: LeadDateRange;
  onDate: (v: LeadDateRange) => void;
  nl: LeadNlFilter | null;
  onNl: (v: LeadNlFilter | null) => void;
  adv: AdvancedFilters;
  onApplyAdv: (v: AdvancedFilters) => void;
  drawerOpen: boolean;
  onToggleDrawer: () => void;
}

export default function LeadsToolbar(p: Props) {
  return (
    <div>
      <div className="lp-table-toolbar">
        <i className="ti ti-search" style={{ color: '#9ca3af', fontSize: 15, flexShrink: 0 }} />
        <div className="lp-search-wrap">
          <input
            type="text"
            value={p.query}
            placeholder="Cari nama, email, telepon, atau produk/layanan…"
            onChange={(e) => p.onQuery(e.target.value)}
          />
        </div>
        <div className="lp-toolbar-right">
          <select className="lp-date-select" value={p.date} onChange={(e) => p.onDate(e.target.value as LeadDateRange)}>
            <option value="semua">Semua Tanggal</option>
            <option value="today">Hari Ini</option>
            <option value="week">7 Hari</option>
            <option value="month">30 Hari</option>
          </select>
          <button className="lp-btn-filter" onClick={p.onToggleDrawer}>
            <i className="ti ti-adjustments-horizontal" /> Filter &amp; Urutkan
          </button>
        </div>
      </div>

      <div className="lp-nl-pills-wrap">
        <span className="lp-nl-label"><i className="ti ti-sparkles" /> Coba tanya AI:</span>
        {NL_PILLS.map((pill) => (
          <button
            key={pill.key}
            className={`lp-nl-pill${p.nl === pill.key ? ' active' : ''}`}
            onClick={() => p.onNl(p.nl === pill.key ? null : pill.key)}
          >
            <i className={`ti ${pill.icon}`} /> {pill.label}
          </button>
        ))}
      </div>

      {p.drawerOpen && <FilterDrawer adv={p.adv} onApply={p.onApplyAdv} onClose={p.onToggleDrawer} />}
    </div>
  );
}

function FilterDrawer({ adv, onApply, onClose }: { adv: AdvancedFilters; onApply: (v: AdvancedFilters) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<AdvancedFilters>(adv);

  const toggle = <K extends 'kategori' | 'sumber' | 'score'>(group: K, key: keyof AdvancedFilters[K]) =>
    setDraft((d) => ({ ...d, [group]: { ...d[group], [key]: !d[group][key] } }));

  return (
    <div className="lp-filter-drawer">
      <div className="lp-fd-row">
        <div className="lp-fd-group">
          <div className="lp-fd-label">Kategori</div>
          <div className="lp-fd-checks">
            {(Object.keys(KATEGORI_LABEL) as LeadKategori[]).map((k) => (
              <label key={k}><input type="checkbox" checked={draft.kategori[k]} onChange={() => toggle('kategori', k)} /> {KATEGORI_LABEL[k]}</label>
            ))}
          </div>
        </div>
        <div className="lp-fd-group">
          <div className="lp-fd-label">Sumber</div>
          <div className="lp-fd-checks">
            {(Object.keys(SUMBER_INFO) as LeadSumber[]).map((k) => (
              <label key={k}><input type="checkbox" checked={draft.sumber[k]} onChange={() => toggle('sumber', k)} /> {SUMBER_INFO[k].name}</label>
            ))}
          </div>
        </div>
        <div className="lp-fd-group">
          <div className="lp-fd-label">AI Score</div>
          <div className="lp-fd-checks">
            {([['HOT', '🔥 HOT'], ['WARM', '🌤 WARM'], ['COLD', '🧊 COLD']] as [AiScoreLevel, string][]).map(([k, label]) => (
              <label key={k}><input type="checkbox" checked={draft.score[k]} onChange={() => toggle('score', k)} /> {label}</label>
            ))}
          </div>
        </div>
        <div className="lp-fd-group">
          <div className="lp-fd-label">Urutkan</div>
          <select
            className="lp-fd-select"
            value={draft.sort}
            onChange={(e) => setDraft((d) => ({ ...d, sort: e.target.value as LeadSortKey }))}
          >
            <option value="score">AI Score (Tertinggi)</option>
            <option value="newest">Tanggal Terbaru</option>
            <option value="belum">Belum Dihubungi</option>
            <option value="nama">Nama A–Z</option>
          </select>
        </div>
        <div className="lp-fd-group lp-fd-actions">
          <button className="lp-btn-ghost" onClick={onClose}>Batal</button>
          <button className="lp-btn-primary-sm" onClick={() => { onApply(draft); onClose(); }}>
            <i className="ti ti-check" /> Terapkan
          </button>
        </div>
      </div>
    </div>
  );
}