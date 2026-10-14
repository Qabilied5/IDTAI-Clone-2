import { AsyncLocalStorage } from 'node:async_hooks';
import { headers } from 'next/headers';

/* =============================================================
   Konteks perusahaan (tenant) untuk backend.
   - Request dari browser: middleware.ts memverifikasi cookie sesi lalu mengisi header
     `x-org-id` (header dari klien SELALU dibuang dulu, jadi tidak bisa dipalsukan).
   - Background job / webhook / polling: dibungkus runWithOrg(orgId, fn).
   Disimpan di globalThis supaya satu instance dipakai bersama oleh semua bundle webpack.
   ============================================================= */

interface OrgCtx { orgId: string }

const g = globalThis as unknown as {
  __idtaiOrgAls?: AsyncLocalStorage<OrgCtx>;
  __idtaiDefaultOrg?: string;
  __idtaiTenantWarned?: number;
};
const als: AsyncLocalStorage<OrgCtx> = (g.__idtaiOrgAls ??= new AsyncLocalStorage<OrgCtx>());

export const ORG_HEADER = 'x-org-id';

export function normOrgId(id: string): string {
  return String(id).trim().toLowerCase();
}

export function setDefaultOrgId(id: string) { g.__idtaiDefaultOrg = normOrgId(id); }
export function getDefaultOrgId(): string | null { return g.__idtaiDefaultOrg ?? null; }

export function runWithOrg<T>(orgId: string, fn: () => T): T {
  return als.run({ orgId: normOrgId(orgId) }, fn);
}

/** ID perusahaan aktif, atau null kalau tidak ada konteks. */
export function currentOrgIdOrNull(): string | null {
  const store = als.getStore();
  if (store) return store.orgId;
  try {
    const v = headers().get(ORG_HEADER);
    if (v) {
      const id = normOrgId(v);
      // Pertahankan konteks untuk pekerjaan async yang dilanjutkan setelah response (fire-and-forget).
      als.enterWith({ orgId: id });
      return id;
    }
  } catch {
    /* di luar request scope (job/timer) — abaikan */
  }
  return null;
}

/** Untuk aksi yang MENULIS data perusahaan: wajib ada konteks, tanpa fallback. */
export function requireOrgId(): string {
  const id = currentOrgIdOrNull();
  if (!id) {
    throw Object.assign(new Error('Perusahaan tidak diketahui — silakan login ulang.'), { status: 401 });
  }
  return id;
}

/** Untuk pembacaan state: pakai perusahaan default bila tidak ada konteks (dengan peringatan). */
export function orgIdOrDefault(): string {
  const id = currentOrgIdOrNull();
  if (id) return id;
  const n = (g.__idtaiTenantWarned = (g.__idtaiTenantWarned ?? 0) + 1);
  if (n <= 10) {
    const where = (new Error().stack || '').split('\n').slice(3, 6).join(' | ').replace(/\s+/g, ' ');
    console.warn(`[tenant] state diakses tanpa konteks perusahaan — fallback ke perusahaan default. ${where}`);
  }
  return getDefaultOrgId() ?? 'default';
}
