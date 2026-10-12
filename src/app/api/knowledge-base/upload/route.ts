import { KB_UPLOAD_ALLOWED_EXT, KB_UPLOAD_MAX_BYTES } from '@/server/config';
import { errMsg, fail, ok } from '@/server/http';
import { kbExtractFileText, kbNextId, kbPublicDoc, kbStoreUploadedFile, kbTrimContent } from '@/server/knowledge-base';
import { state } from '@/server/state';
import { ensureDataLoaded, kbSave } from '@/server/store';
import type { KbDoc } from '@/server/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* Upload file (pdf/docx/xlsx/txt/csv), multipart field "files" (maks 10) — pengganti multer. */
export async function POST(req: Request) {
  try {
    ensureDataLoaded();
    const form = await req.formData();
    const files = form.getAll('files').filter((f): f is File => f instanceof File).slice(0, 10);
    if (!files.length) return fail('Tidak ada file yang diunggah', 400);

    const category = String(form.get('category') || '').trim() || 'umum';
    const created: KbDoc[] = [];
    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (!KB_UPLOAD_ALLOWED_EXT.includes(ext)) return fail(`Tipe file .${ext} tidak didukung`, 400);
      if (file.size > KB_UPLOAD_MAX_BYTES) return fail(`File ${file.name} melebihi batas 20 MB`, 400);

      const stored = await kbStoreUploadedFile(file);
      const text = await kbExtractFileText(stored.storedPath, stored.ext);
      const doc: KbDoc = {
        id: kbNextId(),
        title: file.name.replace(/\.[^.]+$/, ''),
        category,
        status: 'aktif',
        sourceType: 'file',
        fileName: file.name,
        fileExt: stored.ext,
        storedPath: stored.storedPath,
        sizeBytes: stored.size,
        content: kbTrimContent(text),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      state.knowledgeBase.push(doc);
      created.push(doc);
    }
    kbSave();
    return ok({ docs: created.map(kbPublicDoc) });
  } catch (err) {
    return fail(errMsg(err), 400);
  }
}
