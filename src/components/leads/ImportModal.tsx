'use client';

import { useState } from 'react';
import { getSheetUrl } from '@/lib/leads';
import { LeadModalShell } from './LeadModals';

interface Props {
  onClose: () => void;
  onImportUrl: (url: string) => Promise<{ ok: boolean; error?: string }>;
  onImportCsv: (file: File | null | undefined) => Promise<{ ok: boolean; error?: string }>;
  onClear: () => Promise<void>;
}

export default function ImportModal({ onClose, onImportUrl, onImportCsv, onClear }: Props) {
  const [tab, setTab] = useState<'url' | 'csv'>('url');
  const [url, setUrl] = useState(() => getSheetUrl() ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    setBusy(true);
    const r = tab === 'url' ? await onImportUrl(url) : await onImportCsv(file);
    setBusy(false);
    if (r.ok) onClose();
    else setError(r.error ?? 'Gagal memuat data.');
  };

  return (
    <LeadModalShell
      small
      title={<><i className="ti ti-file-spreadsheet" /> Import Excel / Spreadsheets</>}
      onClose={onClose}
      footer={
        <>
          <button className="lp-btn-ghost" onClick={onClose}>Batal</button>
          <button className="lp-btn-primary-sm" onClick={submit} disabled={busy}>
            <i className="ti ti-check" /> {busy ? 'Memuat…' : 'Muat Data'}
          </button>
        </>
      }
    >
      <div className="lp-import-tabs">
        <button className={`lp-import-tab${tab === 'url' ? ' active' : ''}`} onClick={() => { setTab('url'); setError(''); }}>
          <i className="ti ti-link" /> Input URL
        </button>
        <button className={`lp-import-tab${tab === 'csv' ? ' active' : ''}`} onClick={() => { setTab('csv'); setError(''); }}>
          <i className="ti ti-upload" /> Import CSV
        </button>
      </div>

      {tab === 'url' ? (
        <div>
          <label className="lp-import-label">URL Web App Google Apps Script</label>
          <input
            className="lp-fd-input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/xxx/exec"
          />
          <div className="lp-import-hint">
            Tempel URL hasil deploy Apps Script (lihat panduan setup). Data akan dimuat otomatis dan perubahan status di dashboard akan tersinkron balik ke sheet.
          </div>
          <button className="lp-import-clear" onClick={async () => { await onClear(); onClose(); }}>
            Hapus koneksi tersimpan &amp; kembali ke data contoh
          </button>
        </div>
      ) : (
        <div>
          <label className="lp-import-label">Pilih file CSV</label>
          <input type="file" accept=".csv" className="lp-fd-input" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <div className="lp-import-hint">
            Format kolom harus sama seperti template (Nama, Perusahaan, Tanggal, Email, No. HP/WA, Kota, Kategori, Sumber, Aktivitas, Status). Mode ini hanya lokal di browser — perubahan status tidak tersinkron ke mana pun.
          </div>
        </div>
      )}

      {error && <div className="lp-import-error">{error}</div>}
    </LeadModalShell>
  );
}