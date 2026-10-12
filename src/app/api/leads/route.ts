import { NextRequest, NextResponse } from 'next/server';
import { assertSheetUrl, fetchSheet, postSheet } from '@/server/leads';

export const dynamic = 'force-dynamic';

const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

// GET /api/leads?sheetUrl=...             → daftar leads dari Google Sheets
// GET /api/leads?sheetUrl=...&action=raw  → header + isi mentah semua kolom (untuk memilih kolom Pipeline Stage)
export async function GET(req: NextRequest) {
  try {
    const url = assertSheetUrl(req.nextUrl.searchParams.get('sheetUrl'));
    if (req.nextUrl.searchParams.get('action') === 'raw') url.searchParams.set('action', 'raw');
    const data = await fetchSheet(url.toString());
    return NextResponse.json(data);
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Gagal memuat spreadsheet', 502);
  }
}

// POST /api/leads  { sheetUrl, payload: { action: 'updateStatus' | 'updateLead' | 'createLead' | 'setCell', ... } }
export async function POST(req: NextRequest) {
  try {
    const { sheetUrl, payload } = await req.json();
    if (!payload || typeof payload !== 'object') return fail('payload kosong');
    const data = await postSheet(sheetUrl, payload);
    return NextResponse.json(data);
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Gagal sync ke spreadsheet', 502);
  }
}
