'use client';

interface Props {
  count: number;
  onOpenRecommendation: () => void;
  onOpenHow: () => void;
}

export default function AiBanner({ count, onOpenRecommendation, onOpenHow }: Props) {
  return (
    <div className="lp-buy-banner lp-ai-banner">
      <div className="lp-buy-left">
        <div className="lp-buy-icon"><i className="ti ti-brain" /></div>
        <div>
          <div className="lp-buy-badge"><i className="ti ti-sparkles" /> AI RECOMMENDATION</div>
          <div className="lp-buy-title">
            AI menemukan <span className="lp-ai-highlight">{count} kontak aktif</span> hari ini
          </div>
          <div className="lp-buy-desc">
            Berdasarkan riwayat interaksi dan perilaku kontak, AI mengidentifikasi prospek dengan niat tinggi yang belum sempat Anda follow-up. Hubungi sekarang selagi masih hot.
            <span className="lp-ai-refresh-info"><i className="ti ti-refresh" /> Diperbarui otomatis saat data dimuat</span>
          </div>
        </div>
      </div>
      <div className="lp-buy-right">
        <button className="lp-btn-buy-primary" onClick={onOpenRecommendation}>
          <i className="ti ti-sparkles" /> Lihat Rekomendasi AI
        </button>
        <button className="lp-btn-buy-ghost" onClick={onOpenHow}>
          <i className="ti ti-info-circle" /> Cara Kerja AI Leads
        </button>
      </div>
    </div>
  );
}