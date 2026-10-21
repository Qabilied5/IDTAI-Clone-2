/* =============================================================
   src/server/org-repo.ts
   Lapisan SQL Server untuk data bisnis per perusahaan (tabel dari 007):
   PicAgents, PipelineStages, PipelineDeals, KbDocs, Appointments,
   EscalationSettings, AgentIdentity, OrgDataMigrations.

   Prinsip:
   - `state` tetap salinan kerja di memori; modul ini memuatnya saat boot dan menyimpan perubahan.
   - Penyimpanan HANYA menulis baris yang berubah (dibandingkan lewat hash) dan menghapus baris
     yang hilang, dalam satu transaksi. Antrean per (perusahaan, tabel): snapshot terbaru menang.
   - Properti objek yang belum punya kolom disimpan di kolom Extra (JSON) supaya tidak ada data hilang.
   - Jika tulis gagal, snapshot dipertahankan dan dicoba lagi tiap 30 detik selama proses hidup.
   ============================================================= */
import { getPool, sql } from './db';
import type { AiAppointment, KbDoc, PicAgent, PipelineDeal, PipelineStage } from './types';

type SqlType = any;

/* ── helper konversi ─────────────────────────────────────────── */
const clip = (v: unknown, n: number): string | null => (v == null ? null : String(v).slice(0, n));
const toNum = (v: unknown): number | null => {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const toBit = (v: unknown): boolean | null => (v == null ? null : !!v);
const toJson = (v: unknown, fallback: unknown): string => JSON.stringify(v ?? fallback);
function fromJson<T>(v: unknown, fallback: T): T {
  if (typeof v !== 'string' || !v) return fallback;
  try { return JSON.parse(v) as T; } catch { return fallback; }
}
const strOr = (v: unknown, d = ''): string => (v == null ? d : String(v));
const nullable = (v: unknown): string | null => (v == null ? null : String(v));
const numOr = (v: unknown, d = 0): number => (v == null ? d : Number(v));

/* ── mesin generik ───────────────────────────────────────────── */
interface Col {
  name: string;
  type: SqlType;
  to: (o: any) => unknown;
  from: (v: any, o: any) => void;
}
interface Spec {
  table: string;
  idCol: string;
  idType: SqlType;
  idFrom: (v: any) => string | number;
  cols: Col[];
  known: string[];       // properti objek yang dipetakan ke kolom (sisanya masuk Extra)
  ordered: boolean;      // true -> urutan array disimpan di kolom Position
  stamp: string;         // kolom waktu-ubah bawaan DB
  order: string;         // ORDER BY saat memuat
  extraHook?: (o: any) => Record<string, unknown> | null;
  afterLoad?: (o: any, extra: Record<string, any>) => void;
}

const MAX = sql.NVarChar(sql.MAX);
const nv = (n: number) => sql.NVarChar(n);

function extraOf(spec: Spec, o: any): string | null {
  const rest: Record<string, unknown> = {};
  for (const k of Object.keys(o)) if (!spec.known.includes(k)) rest[k] = o[k];
  const hook = spec.extraHook ? spec.extraHook(o) : null;
  if (hook) Object.assign(rest, hook);
  return Object.keys(rest).length ? JSON.stringify(rest) : null;
}

function rowValues(spec: Spec, o: any, pos: number): unknown[] {
  const v: unknown[] = [spec.idFrom(o.id)];
  for (const c of spec.cols) v.push(c.to(o));
  if (spec.ordered) v.push(pos);
  v.push(extraOf(spec, o));
  return v;
}

function colNames(spec: Spec): string[] {
  return [spec.idCol, ...spec.cols.map((c) => c.name), ...(spec.ordered ? ['Position'] : []), 'Extra'];
}
function colTypes(spec: Spec): SqlType[] {
  return [spec.idType, ...spec.cols.map((c) => c.type), ...(spec.ordered ? [sql.Int] : []), MAX];
}

function mergeSql(spec: Spec): string {
  const names = colNames(spec);
  const params = names.map((_, i) => `@p${i}`);
  const sets = names.slice(1).map((n, i) => `${n} = @p${i + 1}`).join(', ');
  return (
    `MERGE dbo.${spec.table} AS t ` +
    `USING (SELECT @org AS OrganizationId, @p0 AS ${spec.idCol}) AS s ` +
    `ON t.OrganizationId = s.OrganizationId AND t.${spec.idCol} = s.${spec.idCol} ` +
    `WHEN MATCHED THEN UPDATE SET ${sets}, ${spec.stamp} = SYSUTCDATETIME() ` +
    `WHEN NOT MATCHED THEN INSERT (OrganizationId, ${names.join(', ')}) VALUES (@org, ${params.join(', ')});`
  );
}

/* ── cache hash baris terakhir yang tersimpan ────────────────── */
const g = globalThis as unknown as {
  __idtaiRepoCache?: Map<string, Map<string, string>>;
  __idtaiRepoLatest?: Map<string, () => Promise<void>>;
  __idtaiRepoRunning?: Set<string>;
};
const caches = (g.__idtaiRepoCache ??= new Map());
const latest = (g.__idtaiRepoLatest ??= new Map());
const running = (g.__idtaiRepoRunning ??= new Set());

/* ── antrean simpan: yang terbaru menang, ulang bila gagal ───── */
const RETRY_MS = 30_000;

async function drain(key: string) {
  try {
    while (latest.has(key)) {
      const task = latest.get(key)!;
      latest.delete(key);
      try {
        await task();
      } catch (e) {
        console.error(`[Repo] Gagal simpan ${key}, dicoba lagi ${RETRY_MS / 1000} detik:`, (e as Error).message);
        if (!latest.has(key)) latest.set(key, task);
        setTimeout(() => {
          if (latest.has(key) && !running.has(key)) {
            running.add(key);
            void drain(key);
          }
        }, RETRY_MS);
        break;
      }
    }
  } finally {
    running.delete(key);
  }
}

function enqueue(key: string, task: () => Promise<void>) {
  latest.set(key, task);
  if (running.has(key)) return;
  running.add(key);
  void drain(key);
}

/** Tunggu sampai semua penyimpanan yang sedang berjalan selesai (dipakai saat migrasi). */
export async function flushAll(timeoutMs = 60_000): Promise<void> {
  const t0 = Date.now();
  while (running.size > 0 && Date.now() - t0 < timeoutMs) await new Promise((r) => setTimeout(r, 25));
}
export function hasPending(): boolean { return latest.size > 0; }

/* ── baca & tulis koleksi ────────────────────────────────────── */
function snapshot(spec: Spec, items: any[]): Map<string, { values: unknown[]; hash: string }> {
  const rows = new Map<string, { values: unknown[]; hash: string }>();
  items.forEach((o, i) => {
    const values = rowValues(spec, o, i);
    rows.set(String(spec.idFrom(o.id)), { values, hash: JSON.stringify(values) });
  });
  return rows;
}

async function loadCollection<T>(orgId: string, spec: Spec): Promise<T[]> {
  const pool = await getPool();
  const res = await pool
    .request()
    .input('org', sql.UniqueIdentifier, orgId)
    .query(`SELECT * FROM dbo.${spec.table} WHERE OrganizationId = @org ORDER BY ${spec.order}`);
  const items = res.recordset.map((row: any) => objectFromRow(spec, row)) as T[];
  caches.set(`${orgId}:${spec.table}`, new Map([...snapshot(spec, items as any[])].map(([id, r]) => [id, r.hash])));
  return items;
}

function objectFromRow(spec: Spec, row: any): any {
  const extra = fromJson<Record<string, any>>(row.Extra, {});
  const o: any = Object.assign({}, extra);
  o.id = spec.idFrom(row[spec.idCol]);
  for (const c of spec.cols) c.from(row[c.name], o);
  if (spec.afterLoad) spec.afterLoad(o, extra);
  return o;
}

function saveCollection(orgId: string, spec: Spec, items: any[]) {
  const rows = snapshot(spec, items); // snapshot SEKARANG, sebelum state berubah lagi
  const key = `${orgId}:${spec.table}`;
  const merge = mergeSql(spec);
  const types = colTypes(spec);

  enqueue(key, async () => {
    const last = caches.get(key);
    const upserts = [...rows].filter(([id, r]) => !last || last.get(id) !== r.hash);
    const deletes = last ? [...last.keys()].filter((id) => !rows.has(id)) : [];
    if (upserts.length === 0 && deletes.length === 0) return;

    const pool = await getPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      for (const id of deletes) {
        await new sql.Request(tx)
          .input('org', sql.UniqueIdentifier, orgId)
          .input('id', spec.idType, spec.idFrom(id))
          .query(`DELETE FROM dbo.${spec.table} WHERE OrganizationId = @org AND ${spec.idCol} = @id`);
      }
      for (const [, r] of upserts) {
        const req = new sql.Request(tx).input('org', sql.UniqueIdentifier, orgId);
        r.values.forEach((val, i) => req.input(`p${i}`, types[i], val));
        await req.query(merge);
      }
      await tx.commit();
    } catch (e) {
      await tx.rollback().catch(() => {});
      throw e;
    }
    caches.set(key, new Map([...rows].map(([id, r]) => [id, r.hash])));
  });
}

/* ── spesifikasi tabel ───────────────────────────────────────── */
const idStr = (v: any) => String(v);
const idInt = (v: any) => Number(v);

const PIC: Spec = {
  table: 'PicAgents', idCol: 'Id', idType: sql.Int, idFrom: idInt, ordered: false,
  stamp: 'UpdatedAt', order: 'Id',
  known: ['id', 'nama', 'email', 'role', 'status', 'initials', 'chat'],
  cols: [
    { name: 'Nama', type: nv(200), to: (o) => clip(o.nama ?? '', 200), from: (v, o) => { o.nama = strOr(v); } },
    { name: 'Email', type: nv(255), to: (o) => clip(o.email ?? '', 255), from: (v, o) => { o.email = strOr(v); } },
    { name: 'Role', type: nv(30), to: (o) => clip(o.role, 30), from: (v, o) => { o.role = strOr(v, 'agent'); } },
    { name: 'Status', type: nv(30), to: (o) => clip(o.status, 30), from: (v, o) => { o.status = strOr(v, 'offline'); } },
    { name: 'Initials', type: nv(10), to: (o) => clip(o.initials, 10), from: (v, o) => { o.initials = strOr(v); } },
    { name: 'Chat', type: sql.Int, to: (o) => toNum(o.chat) ?? 0, from: (v, o) => { o.chat = numOr(v); } },
  ],
};

const STAGES: Spec = {
  table: 'PipelineStages', idCol: 'Id', idType: nv(100), idFrom: idStr, ordered: true,
  stamp: 'UpdatedAt', order: 'Position',
  known: ['id', 'label'],
  cols: [{ name: 'Label', type: nv(100), to: (o) => clip(o.label ?? '', 100), from: (v, o) => { o.label = strOr(v); } }],
};

const DEALS: Spec = {
  table: 'PipelineDeals', idCol: 'Id', idType: nv(100), idFrom: idStr, ordered: true,
  stamp: 'UpdatedAt', order: 'Position',
  known: ['id', 'leadId', 'sheetRow', 'company', 'contactName', 'product', 'value', 'stage', 'type', 'pic',
    'recurring', 'interval', 'endDate', 'date', 'notes', 'activity'],
  cols: [
    { name: 'LeadId', type: sql.BigInt, to: (o) => toNum(o.leadId), from: (v, o) => { o.leadId = v == null ? null : Number(v); } },
    { name: 'SheetRow', type: sql.Int, to: (o) => toNum(o.sheetRow), from: (v, o) => { o.sheetRow = v == null ? null : Number(v); } },
    { name: 'Company', type: nv(255), to: (o) => clip(o.company ?? '', 255), from: (v, o) => { o.company = strOr(v); } },
    { name: 'ContactName', type: nv(255), to: (o) => clip(o.contactName ?? '', 255), from: (v, o) => { o.contactName = strOr(v); } },
    { name: 'Product', type: nv(255), to: (o) => clip(o.product ?? '', 255), from: (v, o) => { o.product = strOr(v); } },
    { name: 'DealValue', type: sql.Decimal(19, 2), to: (o) => toNum(o.value) ?? 0, from: (v, o) => { o.value = numOr(v); } },
    { name: 'Stage', type: nv(100), to: (o) => clip(o.stage, 100), from: (v, o) => { o.stage = strOr(v); } },
    { name: 'DealType', type: nv(30), to: (o) => clip(o.type, 30), from: (v, o) => { o.type = strOr(v, 'baru'); } },
    { name: 'Pic', type: nv(200), to: (o) => clip(o.pic ?? '', 200), from: (v, o) => { o.pic = strOr(v); } },
    { name: 'Recurring', type: sql.Bit, to: (o) => !!o.recurring, from: (v, o) => { o.recurring = !!v; } },
    { name: 'RecurInterval', type: nv(30), to: (o) => clip(o.interval, 30), from: (v, o) => { o.interval = nullable(v); } },
    { name: 'EndDate', type: nv(30), to: (o) => clip(o.endDate, 30), from: (v, o) => { o.endDate = nullable(v); } },
    { name: 'DealDate', type: nv(30), to: (o) => clip(o.date, 30), from: (v, o) => { o.date = strOr(v); } },
    { name: 'Notes', type: MAX, to: (o) => o.notes ?? '', from: (v, o) => { o.notes = strOr(v); } },
    { name: 'Activity', type: MAX, to: (o) => toJson(o.activity, []), from: (v, o) => { o.activity = fromJson(v, []); } },
  ],
};

const KB: Spec = {
  table: 'KbDocs', idCol: 'Id', idType: sql.Int, idFrom: idInt, ordered: false,
  stamp: 'DbUpdatedAt', order: 'Id',
  known: ['id', 'title', 'category', 'status', 'sourceType', 'fileName', 'fileExt', 'storedPath', 'sizeBytes', 'url',
    'autoSync', 'crawlBatchId', 'aiFiltered', 'aiFilterNote', 'content', 'createdAt', 'updatedAt'],
  cols: [
    { name: 'Title', type: nv(500), to: (o) => clip(o.title ?? '', 500), from: (v, o) => { o.title = strOr(v); } },
    { name: 'Category', type: nv(100), to: (o) => clip(o.category, 100), from: (v, o) => { o.category = strOr(v); } },
    { name: 'Status', type: nv(20), to: (o) => clip(o.status, 20), from: (v, o) => { o.status = strOr(v, 'aktif'); } },
    { name: 'SourceType', type: nv(20), to: (o) => clip(o.sourceType, 20), from: (v, o) => { o.sourceType = strOr(v, 'teks'); } },
    { name: 'FileName', type: nv(500), to: (o) => clip(o.fileName, 500), from: (v, o) => { o.fileName = nullable(v); } },
    { name: 'FileExt', type: nv(20), to: (o) => clip(o.fileExt, 20), from: (v, o) => { o.fileExt = nullable(v); } },
    { name: 'StoredPath', type: nv(1000), to: (o) => clip(o.storedPath, 1000), from: (v, o) => { if (v != null) o.storedPath = String(v); } },
    { name: 'SizeBytes', type: sql.BigInt, to: (o) => toNum(o.sizeBytes), from: (v, o) => { if (v != null) o.sizeBytes = Number(v); } },
    { name: 'Url', type: nv(2000), to: (o) => clip(o.url, 2000), from: (v, o) => { o.url = nullable(v); } },
    { name: 'AutoSync', type: sql.Bit, to: (o) => toBit(o.autoSync), from: (v, o) => { if (v != null) o.autoSync = !!v; } },
    { name: 'CrawlBatchId', type: nv(100), to: (o) => clip(o.crawlBatchId, 100), from: (v, o) => { o.crawlBatchId = nullable(v); } },
    { name: 'AiFiltered', type: sql.Bit, to: (o) => toBit(o.aiFiltered), from: (v, o) => { if (v != null) o.aiFiltered = !!v; } },
    { name: 'AiFilterNote', type: MAX, to: (o) => o.aiFilterNote ?? null, from: (v, o) => { o.aiFilterNote = nullable(v); } },
    { name: 'Content', type: MAX, to: (o) => o.content ?? '', from: (v, o) => { o.content = strOr(v); } },
    { name: 'CreatedAt', type: sql.BigInt, to: (o) => toNum(o.createdAt), from: (v, o) => { o.createdAt = numOr(v); } },
    { name: 'UpdatedAt', type: sql.BigInt, to: (o) => toNum(o.updatedAt), from: (v, o) => { o.updatedAt = numOr(v); } },
  ],
};

const APPTS: Spec = {
  table: 'Appointments', idCol: 'Id', idType: nv(100), idFrom: idStr, ordered: true,
  stamp: 'UpdatedAt', order: 'Position',
  known: ['id', 'nama', 'company', 'phone', 'email', 'date', 'time', 'duration', 'type', 'typeLabel', 'sales',
    'status', 'createdBy', 'location', 'notes', 'aiNote', 'chatId', 'leadId', 'calendlyEventUri',
    'calendlyInviteeUri', 'timeline'],
  // leadId di kode bertipe string; kolom BIGINT. Jika bukan angka, simpan apa adanya di Extra.
  extraHook: (o) => (o.leadId != null && toNum(o.leadId) == null ? { leadId: o.leadId } : null),
  afterLoad: (o, extra) => { if ('leadId' in extra) o.leadId = extra.leadId; },
  cols: [
    { name: 'Nama', type: nv(255), to: (o) => clip(o.nama, 255), from: (v, o) => { o.nama = strOr(v); } },
    { name: 'Company', type: nv(255), to: (o) => clip(o.company, 255), from: (v, o) => { o.company = strOr(v); } },
    { name: 'Phone', type: nv(100), to: (o) => clip(o.phone, 100), from: (v, o) => { o.phone = strOr(v); } },
    { name: 'Email', type: nv(255), to: (o) => clip(o.email, 255), from: (v, o) => { o.email = strOr(v); } },
    { name: 'ApptDate', type: nv(20), to: (o) => clip(o.date, 20), from: (v, o) => { o.date = strOr(v); } },
    { name: 'ApptTime', type: nv(20), to: (o) => clip(o.time, 20), from: (v, o) => { o.time = strOr(v); } },
    { name: 'Duration', type: sql.Int, to: (o) => toNum(o.duration), from: (v, o) => { o.duration = numOr(v); } },
    { name: 'ApptType', type: nv(50), to: (o) => clip(o.type, 50), from: (v, o) => { o.type = strOr(v); } },
    { name: 'TypeLabel', type: nv(100), to: (o) => clip(o.typeLabel, 100), from: (v, o) => { o.typeLabel = strOr(v); } },
    { name: 'Sales', type: nv(200), to: (o) => clip(o.sales, 200), from: (v, o) => { o.sales = strOr(v); } },
    { name: 'Status', type: nv(30), to: (o) => clip(o.status, 30), from: (v, o) => { o.status = strOr(v); } },
    { name: 'CreatedBy', type: nv(30), to: (o) => clip(o.createdBy, 30), from: (v, o) => { o.createdBy = strOr(v); } },
    { name: 'Location', type: nv(1000), to: (o) => clip(o.location, 1000), from: (v, o) => { o.location = strOr(v); } },
    { name: 'Notes', type: MAX, to: (o) => o.notes ?? '', from: (v, o) => { o.notes = strOr(v); } },
    { name: 'AiNote', type: MAX, to: (o) => o.aiNote ?? '', from: (v, o) => { o.aiNote = strOr(v); } },
    { name: 'ChatId', type: nv(100), to: (o) => clip(o.chatId, 100), from: (v, o) => { o.chatId = nullable(v); } },
    { name: 'LeadId', type: sql.BigInt, to: (o) => toNum(o.leadId), from: (v, o) => { o.leadId = v == null ? null : String(v); } },
    { name: 'CalendlyEventUri', type: nv(500), to: (o) => clip(o.calendlyEventUri, 500), from: (v, o) => { if (v != null) o.calendlyEventUri = String(v); } },
    { name: 'CalendlyInviteeUri', type: nv(500), to: (o) => clip(o.calendlyInviteeUri, 500), from: (v, o) => { if (v != null) o.calendlyInviteeUri = String(v); } },
    { name: 'Timeline', type: MAX, to: (o) => toJson(o.timeline, []), from: (v, o) => { o.timeline = fromJson(v, []); } },
  ],
};

/* ── API koleksi ─────────────────────────────────────────────── */
export const loadPic = (org: string) => loadCollection<PicAgent>(org, PIC);
export const loadStages = (org: string) => loadCollection<PipelineStage>(org, STAGES);
export const loadDeals = (org: string) => loadCollection<PipelineDeal>(org, DEALS);
export const loadKb = (org: string) => loadCollection<KbDoc>(org, KB);
export const loadAppointments = (org: string) => loadCollection<AiAppointment>(org, APPTS);

export const savePic = (org: string, items: PicAgent[]) => saveCollection(org, PIC, items);
export const saveStages = (org: string, items: PipelineStage[]) => saveCollection(org, STAGES, items);
export const saveDeals = (org: string, items: PipelineDeal[]) => saveCollection(org, DEALS, items);
export const saveKb = (org: string, items: KbDoc[]) => saveCollection(org, KB, items);
export const saveAppointments = (org: string, items: AiAppointment[]) => saveCollection(org, APPTS, items);

/* ── pengaturan eskalasi (1 baris/perusahaan, JSON) ──────────── */
export async function loadEscalation(orgId: string): Promise<any | null> {
  const pool = await getPool();
  const res = await pool
    .request()
    .input('org', sql.UniqueIdentifier, orgId)
    .query('SELECT SettingsJson FROM dbo.EscalationSettings WHERE OrganizationId = @org');
  const row = res.recordset[0];
  return row ? fromJson<any>(row.SettingsJson, null) : null;
}

export function saveEscalation(orgId: string, settings: unknown) {
  const json = JSON.stringify(settings);
  enqueue(`${orgId}:EscalationSettings`, async () => {
    const pool = await getPool();
    await pool
      .request()
      .input('org', sql.UniqueIdentifier, orgId)
      .input('json', MAX, json)
      .query(
        `MERGE dbo.EscalationSettings AS t USING (SELECT @org AS OrganizationId) AS s
           ON t.OrganizationId = s.OrganizationId
         WHEN MATCHED THEN UPDATE SET SettingsJson = @json, UpdatedAt = SYSUTCDATETIME()
         WHEN NOT MATCHED THEN INSERT (OrganizationId, SettingsJson) VALUES (@org, @json);`
      );
  });
}

/* ── identitas agent (1 baris/perusahaan) ────────────────────── */
export async function loadIdentity(
  orgId: string
): Promise<{ botName?: string; companyName?: string; companyDesc?: string; extra: Record<string, unknown> } | null> {
  const pool = await getPool();
  const res = await pool
    .request()
    .input('org', sql.UniqueIdentifier, orgId)
    .query('SELECT BotName, CompanyName, CompanyDesc, Extra FROM dbo.AgentIdentity WHERE OrganizationId = @org');
  const row = res.recordset[0];
  if (!row) return null;
  return {
    botName: row.BotName ?? undefined,
    companyName: row.CompanyName ?? undefined,
    // NULL = belum pernah diisi (nilai awal dari .env tetap dipakai); '' = sengaja dikosongkan.
    companyDesc: row.CompanyDesc ?? undefined,
    extra: fromJson<Record<string, unknown>>(row.Extra, {}),
  };
}

export function saveIdentity(
  orgId: string,
  intro: { botName: string; companyName: string; companyDesc?: string }
) {
  // Field persona lain (tone, sop, tagline, ...) yang ikut ada di objek disimpan di kolom Extra (JSON).
  const { botName, companyName, companyDesc, ...rest } = intro;
  const extra = Object.keys(rest).length ? JSON.stringify(rest) : null;
  enqueue(`${orgId}:AgentIdentity`, async () => {
    const pool = await getPool();
    await pool
      .request()
      .input('org', sql.UniqueIdentifier, orgId)
      .input('bot', nv(100), clip(botName, 100))
      .input('comp', nv(150), clip(companyName, 150))
      .input('desc', MAX, companyDesc ?? null)
      .input('extra', MAX, extra)
      .query(
        `MERGE dbo.AgentIdentity AS t USING (SELECT @org AS OrganizationId) AS s
           ON t.OrganizationId = s.OrganizationId
         WHEN MATCHED THEN UPDATE SET BotName = @bot, CompanyName = @comp, CompanyDesc = @desc, Extra = @extra, UpdatedAt = SYSUTCDATETIME()
         WHEN NOT MATCHED THEN INSERT (OrganizationId, BotName, CompanyName, CompanyDesc, Extra) VALUES (@org, @bot, @comp, @desc, @extra);`
      );
  });
}

/* ── penanda migrasi (impor file JSON lama, sekali per perusahaan) ── */
export async function hasMigration(orgId: string, name: string): Promise<boolean> {
  const pool = await getPool();
  const res = await pool
    .request()
    .input('org', sql.UniqueIdentifier, orgId)
    .input('name', nv(60), name)
    .query('SELECT 1 AS x FROM dbo.OrgDataMigrations WHERE OrganizationId = @org AND Name = @name');
  return res.recordset.length > 0;
}

export async function markMigrated(orgId: string, name: string): Promise<void> {
  const pool = await getPool();
  await pool
    .request()
    .input('org', sql.UniqueIdentifier, orgId)
    .input('name', nv(60), name)
    .query(
      `IF NOT EXISTS (SELECT 1 FROM dbo.OrgDataMigrations WHERE OrganizationId = @org AND Name = @name)
         INSERT INTO dbo.OrgDataMigrations (OrganizationId, Name) VALUES (@org, @name);`
    );
}

/** Dipakai pengujian. */
export const __internals = { PIC, STAGES, DEALS, KB, APPTS, rowValues, objectFromRow, mergeSql, snapshot };
