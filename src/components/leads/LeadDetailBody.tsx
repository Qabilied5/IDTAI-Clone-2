'use client';

import type { Lead } from '@/types/lead';
import { KATEGORI_LABEL, STATUS_LABEL, SUMBER_INFO, formatRupiah } from '@/lib/leads';

export default function LeadDetailBody({ lead }: { lead: Lead }) {
  const rows: [string, string | undefined][] = [
    ['Perusahaan', lead.perusahaan],
    ['Jabatan', lead.jabatan],
    ['Email', lead.email],
    ['No. HP / WA', lead.phone],
    ['Kota', lead.kota],
    ['Tanggal', lead.tanggal],
    ['Kategori', KATEGORI_LABEL[lead.kategori]],
    ['Sumber', SUMBER_INFO[lead.sumber].name],
    ['Aktivitas', lead.aktivitas],
    ['Status', STATUS_LABEL[lead.status]],
    ['Produk / Layanan', lead.tipeLayanan],
    ['Estimasi Nominal', formatRupiah(lead.estimasiNominal)],
    ['Aksi Selanjutnya', lead.aksiSelanjutnya],
    ['Pipeline Stage', lead.pipelineStage],
  ];

  return (
    <>
      {rows.filter(([, v]) => v).map(([label, val]) => (
        <div className="lp-detail-row" key={label}>
          <span className="lp-detail-label">{label}</span>
          <span className="lp-detail-val">{val}</span>
        </div>
      ))}
    </>
  );
}