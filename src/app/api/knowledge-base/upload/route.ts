import fs from 'fs';
import { fail, ok } from '@/server/http';
import { kbExtractFileText, kbNextId, kbPublicDoc, kbStoreUploadedFile, kbTrimContent } from '@/server/knowledge-base';
import { state } from '@/server/state';
import { ensureDataLoaded, kbSave } from '@/server/store';
import type { KbDoc } from '@/server/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const ALLOWED_EXT = ['pdf', 'docx', 'xlsx', 'xls', 'txt', 'csv'];
const MAX_FILE_BYTES = 20 * 1024 * 1024;

/* POST /api/knowledge-base/upload — multipart: files[] + category */
export async function POST(req: Request) {
  ensureDataLoaded();
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail('Form upload tidak valid', 400);
  }

  const files = form.getAll('files').filter((f): f is File => typeof f !== 'string');
  const category = String(form.get('category') ?? '').trim() || 'umum';
  if (!files.length) return fail('Pilih minimal 1 file', 400);

  const created: KbDoc[] = [];
  const errors: string[] = [];

  for (const file of files) {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      errors.push(`${file.name}: format .${ext || '?'} tidak didukung`);
      continue;
    }
    if (file.size > MAX_FILE_BYTES) {
      errors.push(`${file.name}: ukuran melebihi 20 MB`);
      continue;
    }

    const stored = await kbStoreUploadedFile(file);
    let text = '';
    try {
      text = await kbExtractFileText(stored.storedPath, stored.ext);
    } finally {
      // Isi teks sudah disimpan di dokumen; file mentah tidak dipakai lagi.
      try { fs.unlinkSync(stored.storedPath); } catch { /* abaikan */ }
    }

    const now = Date.now();
    const doc: KbDoc = {
      id: kbNextId(),
      title: file.name.replace(/\.[^.]+$/, ''),
      category,
      status: 'aktif',
      sourceType: 'file',
      fileName: file.name,
      fileExt: stored.ext,
      sizeBytes: stored.size,
      content: kbTrimContent(text) || '[Ekstraksi gagal: tidak ada teks yang bisa dibaca dari file ini]',
      createdAt: now,
      updatedAt: now,
    };
    state.knowledgeBase.push(doc);
    created.push(doc);
  }

  if (!created.length) return fail(errors.join('; ') || 'Tidak ada file yang diproses', 400);
  kbSave();
  return ok({ docs: created.map(kbPublicDoc), errors });
}
