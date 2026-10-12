'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatProvider, Lead, LeadDataSource, LeadEditableFields, LeadStatus } from '@/types/lead';
import {
  FALLBACK_LEADS, SUMBER_INFO, clearSheetUrl, getSheetUrl, leadsFromCsvRows,
  normalizeLead, parseCsvText, saveSheetUrl, toWaNumber,
} from '@/lib/leads';

export type ToastType = 'success' | 'error' | '';
export type Notify = (msg: string, type?: ToastType) => void;

/* ── Toast ────────────────────────────────────────────────────── */
export function useLeadToast() {
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const notify = useCallback<Notify>((msg, type = '') => {
    setToast({ msg, type });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);
  return { toast, notify };
}

/* ── Provider chat aktif ──────────────────────────────────────── */
export function useChatProvider() {
  const [provider, setProvider] = useState<ChatProvider>(null);

  const refresh = useCallback(async (): Promise<ChatProvider> => {
    try {
      const res = await fetch('/api/leads/chat-provider', { cache: 'no-store' });
      const data = await res.json();
      const p = (data.provider ?? null) as ChatProvider;
      setProvider(p);
      return p;
    } catch {
      setProvider(null);
      return null;
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  return { provider, refresh };
}

/* ── Leads ────────────────────────────────────────────────────── */
type FetchResult = { ok: true; leads: Lead[] } | { ok: false; error: string };

async function fetchSheetLeads(sheetUrl: string): Promise<FetchResult> {
  try {
    const res = await fetch(`/api/leads?sheetUrl=${encodeURIComponent(sheetUrl)}`, { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok || !data.ok) return { ok: false, error: data.error || `Request gagal (${res.status})` };
    return { ok: true, leads: (data.leads as Lead[]).map(normalizeLead) };
  } catch {
    return { ok: false, error: 'Tidak bisa terhubung ke server' };
  }
}

export function useLeads(notify: Notify) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [source, setSource] = useState<LeadDataSource>('fallback');
  const [loading, setLoading] = useState(true);
  const sourceRef = useRef<LeadDataSource>('fallback');

  const applySource = useCallback((s: LeadDataSource) => {
    sourceRef.current = s;
    setSource(s);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const url = getSheetUrl();
    if (!url) {
      setLeads(FALLBACK_LEADS);
      applySource('fallback');
      setLoading(false);
      return;
    }
    const r = await fetchSheetLeads(url);
    if (r.ok) {
      setLeads(r.leads);
      applySource('sheet');
    } else {
      setLeads([]);
      applySource('fallback');
      notify('Gagal memuat data dari Google Sheets: ' + r.error, 'error');
    }
    setLoading(false);
  }, [applySource, notify]);

  useEffect(() => { void load(); }, [load]);

  /** Sinkron balik ke Sheets — hanya bila sumber data = spreadsheet. */
  const syncToSheet = useCallback(async (payload: Record<string, unknown>, failMsg: string) => {
    if (sourceRef.current !== 'sheet') return;
    const sheetUrl = getSheetUrl();
    if (!sheetUrl) return;
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetUrl, payload }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error);
    } catch {
      notify(failMsg, 'error');
    }
  }, [notify]);

  const updateStatus = useCallback((id: number, status: LeadStatus) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    void syncToSheet({ action: 'updateStatus', id, status }, 'Status tersimpan lokal, tapi gagal sync ke Sheets');
  }, [syncToSheet]);

  const updateLead = useCallback((id: number, fields: LeadEditableFields) => {
    setLeads((prev) => prev.map((l) => {
      if (l.id !== id) return l;
      const next = { ...l, ...fields };
      if (fields.sumber) next.aktivitas = SUMBER_INFO[fields.sumber].name;
      return next;
    }));
    void syncToSheet({ action: 'updateLead', id, fields }, 'Perubahan tersimpan lokal, tapi gagal sync ke Sheets');
  }, [syncToSheet]);

  const contactWa = useCallback((lead: Lead) => {
    if (lead.status === 'belum') updateStatus(lead.id, 'dihubungi');
    notify(`Membuka WhatsApp untuk ${lead.nama}…`, 'success');
    window.open(`https://wa.me/${toWaNumber(lead.phone)}`, '_blank', 'noopener,noreferrer');
  }, [notify, updateStatus]);

  const importFromUrl = useCallback(async (raw: string): Promise<{ ok: boolean; error?: string }> => {
    const url = raw.trim();
    if (!url) return { ok: false, error: 'URL tidak boleh kosong.' };
    if (!/^https?:\/\//i.test(url)) return { ok: false, error: 'URL tidak valid. Pastikan diawali https://' };

    const r = await fetchSheetLeads(url);
    if (!r.ok) {
      return { ok: false, error: 'Gagal memuat dari URL ini: ' + r.error + '. Pastikan itu URL Web App Apps Script (diakhiri /exec) dan sudah di-deploy dengan akses "Anyone".' };
    }
    saveSheetUrl(url);
    setLeads(r.leads);
    applySource('sheet');
    notify('Data berhasil dimuat dari spreadsheet ✓', 'success');
    return { ok: true };
  }, [applySource, notify]);

  const importFromCsv = useCallback(async (file: File | null | undefined): Promise<{ ok: boolean; error?: string }> => {
    if (!file) return { ok: false, error: 'Pilih file CSV terlebih dahulu.' };
    try {
      const parsed = leadsFromCsvRows(parseCsvText(await file.text()));
      if (parsed.length === 0) return { ok: false, error: 'Tidak ada data yang terbaca dari file ini. Cek format kolomnya sesuai template.' };
      setLeads(parsed);
      applySource('csv');
      notify(`${parsed.length} leads berhasil diimport dari CSV ✓ (mode lokal, status tidak tersinkron ke Sheets)`, 'success');
      return { ok: true };
    } catch {
      return { ok: false, error: 'Gagal membaca file CSV. Pastikan formatnya sesuai template.' };
    }
  }, [applySource, notify]);

  const clearConnection = useCallback(async () => {
    clearSheetUrl();
    await load();
    notify('Koneksi spreadsheet dihapus, kembali ke data contoh', 'success');
  }, [load, notify]);

  return {
    leads, source, loading, load,
    updateStatus, updateLead, contactWa,
    importFromUrl, importFromCsv, clearConnection,
  };
}