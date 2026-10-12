'use client';

import type { AiScore, Lead, LeadDataSource } from '@/types/lead';
import {
  KATEGORI_ICON, KATEGORI_LABEL, SCORE_ICON, STATUS_CLASS, STATUS_ICON, STATUS_LABEL, SUMBER_INFO, getAiUrgency,
} from '@/lib/leads';

interface Props {
  rows: Lead[];
  loading: boolean;
  source: LeadDataSource;
  aiScores: Map<number, AiScore>;
  selected: Set<number>;
  onToggle: (id: number) => void;
  onToggleAll: (checked: boolean) => void;
  total: number;
  page: number;
  pages: number;
  perPage: number;
  onPage: (p: number) => void;
  onStatus: (id: number) => void;
  onWa: (lead: Lead) => void;
  onMore: (id: number) => void;
  onAiFollowup: (id: number) => void;
}

const URGENCY_ICON = { 'hot-time': 'ti-flame', 'warn-time': 'ti-alert-triangle', 'ok-time': 'ti-circle-check', 'neutral-time': 'ti-clock' } as const;

export default function LeadsTable(p: Props) {
  const allChecked = p.rows.length > 0 && p.rows.every((r) => p.selected.has(r.id));
  const start = (p.page - 1) * p.perPage + 1;
  const end = Math.min(p.page * p.perPage, p.total);

  let startP = Math.max(1, p.page - 2);
  const endP = Math.min(p.pages, startP + 4);
  startP = Math.max(1, endP - 4);
  const nums = Array.from({ length: endP - startP + 1 }, (_, i) => startP + i);

  return (
    <>
      <div className="lp-table-wrap">
        <div className="lp-th-row">
          <div className="lp-th-check">
            <input type="checkbox" checked={allChecked} onChange={(e) => p.onToggleAll(e.target.checked)} />
          </div>
          <div className="lp-th">Nama &amp; Perusahaan</div>
          <div className="lp-th">Kontak</div>
          <div className="lp-th">Aktivitas Terakhir</div>
          <div className="lp-th" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <i className="ti ti-sparkles" style={{ color: 'var(--red)', fontSize: 11 }} /> AI Score
          </div>
          <div className="lp-th">Status</div>
          <div className="lp-th">Aksi</div>
        </div>

        <div>
          {p.loading && (
            <div className="lp-loading">
              <i className="ti ti-loader-2 lp-spin" /> Memuat data leads…
            </div>
          )}
          {!p.loading && p.rows.map((lead) => {
            const ai = p.aiScores.get(lead.id) ?? { score: 'WARM' as const, reason: 'Sedang dianalisa' };
            const urg = getAiUrgency(lead, p.source);
            const src = SUMBER_INFO[lead.sumber];
            const email = lead.email.length > 22 ? lead.email.slice(0, 22) + '…' : lead.email;

            return (
              <div className="lp-row" key={lead.id}>
                <div>
                  <input type="checkbox" className="lp-row-check" checked={p.selected.has(lead.id)} onChange={() => p.onToggle(lead.id)} />
                </div>

                <div>
                  <div className="lp-row-name">{lead.nama}</div>
                  <div className="lp-row-company"><i className="ti ti-building-store" style={{ fontSize: 10 }} />{lead.perusahaan}</div>
                  <div className="lp-row-date"><i className="ti ti-clock" style={{ fontSize: 10 }} />{lead.tanggal}</div>
                  <div className="lp-row-tags">
                    <span className={`lp-tag ${lead.kategori}`}>
                      <i className={`ti ${KATEGORI_ICON[lead.kategori]}`} style={{ fontSize: 9 }} />{KATEGORI_LABEL[lead.kategori]}
                    </span>
                    <span className={`lp-tag ${src.tag}`}>
                      <i className={`ti ${src.icon}`} style={{ fontSize: 9 }} />{src.name}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="lp-contact-email"><i className="ti ti-mail" style={{ fontSize: 10, opacity: 0.6 }} />{email}</div>
                  <div className="lp-contact-phone"><i className="ti ti-phone" style={{ fontSize: 10, opacity: 0.6 }} />{lead.phone}</div>
                  <div className="lp-contact-city"><i className="ti ti-map-pin" style={{ fontSize: 10, opacity: 0.6 }} />{lead.kota}</div>
                </div>

                <div>
                  <span className={`lp-aktivitas-badge ${lead.sumber}`}>
                    <i className={`ti ${src.icon}`} style={{ fontSize: 11 }} />{lead.aktivitas}
                  </span>
                  <div style={{ marginTop: 5 }}>
                    <span className={`lp-urgency-tag ${urg.cls}`}>
                      <i className={`ti ${URGENCY_ICON[urg.cls]}`} style={{ fontSize: 9 }} />{urg.text}
                    </span>
                  </div>
                </div>

                <div className="lp-ai-score-cell">
                  <span className={`lp-score-badge ${ai.score.toLowerCase()}`}>{SCORE_ICON[ai.score]} {ai.score}</span>
                  <div className="lp-score-reason">{ai.reason}</div>
                </div>

                <div>
                  <button className={`lp-status-followup ${STATUS_CLASS[lead.status]}`} onClick={() => p.onStatus(lead.id)}>
                    <i className={`ti ${STATUS_ICON[lead.status]}`} />{STATUS_LABEL[lead.status]}
                  </button>
                </div>

                <div className="lp-aksi-wrap">
                  <div className="lp-aksi-row">
                    <button className="lp-btn-wa" onClick={() => p.onWa(lead)}>
                      <i className="ti ti-brand-whatsapp" /> Hubungi WA
                    </button>
                    <button className="lp-btn-more" aria-label="Detail" onClick={() => p.onMore(lead.id)}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
                      </svg>
                    </button>
                  </div>
                  <div className="lp-aksi-row">
                    <button className="lp-btn-ai-followup" onClick={() => p.onAiFollowup(lead.id)}>
                      <i className="ti ti-brain" /> Follow-up AI
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {!p.loading && p.rows.length === 0 && (
            <div className="lp-empty">
              <i className="ti ti-search-off" />
              <div>Tidak ada leads ditemukan</div>
              <span>Coba ubah filter atau kata kunci pencarian</span>
            </div>
          )}
        </div>
      </div>

      <div className="lp-pagination">
        <div className="lp-page-info">
          {p.total === 0 ? 'Tidak ada leads' : `Menampilkan ${start}–${end} dari ${p.total} leads`}
        </div>
        <div className="lp-page-btns">
          <button className="lp-page-btn" disabled={p.page <= 1} onClick={() => p.onPage(p.page - 1)} aria-label="Sebelumnya">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <div style={{ display: 'flex', gap: 4 }}>
            {nums.map((n) => (
              <button key={n} className={`lp-page-num${n === p.page ? ' active' : ''}`} onClick={() => p.onPage(n)}>{n}</button>
            ))}
          </div>
          <button className="lp-page-btn" disabled={p.page >= p.pages} onClick={() => p.onPage(p.page + 1)} aria-label="Berikutnya">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
      </div>
    </>
  );
}