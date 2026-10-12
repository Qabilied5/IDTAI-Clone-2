'use client';

import type { LeadKategori } from '@/types/lead';

export type KatKey = 'semua' | LeadKategori;

interface Props {
  counts: Record<KatKey, number>;
  active: KatKey;
  onSelect: (k: KatKey) => void;
}

const svgProps = {
  xmlns: 'http://www.w3.org/2000/svg', width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export default function CategoryCards({ counts, active, onSelect }: Props) {
  const total = counts.semua;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  return (
    <div className="lp-section">
      <div className="lp-sec-head">
        <div className="lp-sec-title">
          <i className="ti ti-layout-grid" style={{ color: 'var(--red)' }} />
          Kategori Leads
          <span className="lp-ai-section-tag"><i className="ti ti-sparkles" /> AI Auto-Qualify</span>
        </div>
      </div>

      <div className="lp-kategori-row">
        <button className={`lp-kat-btn${active === 'semua' ? ' active' : ''}`} onClick={() => onSelect('semua')}>
          <div className="lp-kat-icon red">
            <svg {...svgProps}><circle cx="9" cy="7" r="3" /><path d="M3 19a6 6 0 0 1 12 0" /><circle cx="17" cy="8" r="2.5" opacity=".6" /><path d="M15 18a4 4 0 0 1 6 0" opacity=".6" /></svg>
          </div>
          <div>
            <div className="lp-kat-num">{counts.semua}</div>
            <div className="lp-kat-label">Semua</div>
          </div>
        </button>

        <button className={`lp-kat-btn${active === 'real' ? ' active' : ''}`} onClick={() => onSelect('real')}>
          <div className="lp-kat-icon green">
            <svg {...svgProps}><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-5" /></svg>
          </div>
          <div>
            <div className="lp-kat-num">{counts.real}</div>
            <div className="lp-kat-label">Real Lead</div>
            <div className="lp-ai-qualify-badge green">
              <i className="ti ti-sparkles" style={{ fontSize: 8 }} /> {pct(counts.real)}% relevan dengan bisnis Anda
            </div>
          </div>
        </button>

        <button className={`lp-kat-btn${active === 'potensi' ? ' active' : ''}`} onClick={() => onSelect('potensi')}>
          <div className="lp-kat-icon amber">
            <svg {...svgProps}><polygon points="12,3 15,9 21,9.5 16.5,14 18,20 12,17 6,20 7.5,14 3,9.5 9,9" /></svg>
          </div>
          <div>
            <div className="lp-kat-num">{counts.potensi}</div>
            <div className="lp-kat-label">Potensi</div>
            <div className="lp-ai-qualify-badge amber">
              <i className="ti ti-sparkles" style={{ fontSize: 8 }} /> {pct(counts.potensi)}% worth follow-up
            </div>
          </div>
        </button>

        <button className={`lp-kat-btn${active === 'belum' ? ' active' : ''}`} onClick={() => onSelect('belum')}>
          <div className="lp-kat-icon gray">
            <svg {...svgProps}><circle cx="12" cy="12" r="9" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
          </div>
          <div>
            <div className="lp-kat-num">{counts.belum}</div>
            <div className="lp-kat-label">Belum Dikualifikasi</div>
            <div className="lp-ai-qualify-badge gray">
              <i className="ti ti-loader-2 lp-spin" style={{ fontSize: 8 }} /> Sedang dievaluasi AI…
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}