/* =============================================================
   src/server/conv-repo.ts
   Riwayat percakapan di SQL Server: dbo.Contacts, dbo.Conversations, dbo.ChatMessages.

   Percakapan di aplikasi tetap hidup di `state` (Map di memori) agar kode lama tidak berubah.
   Modul ini (1) memuat semuanya saat boot dan (2) menyimpan perubahan: hanya kontak/percakapan yang
   berubah (dibandingkan lewat hash) dan HANYA pesan baru (pesan bersifat append-only).
   Karena itu tidak perlu menambal tiap tempat yang mengubah percakapan — cukup memanggil
   saveConversations() setelah pesan diproses dan secara berkala.
   Jika penulisan gagal, cache tidak diubah sehingga sapuan berikutnya mencoba lagi otomatis.
   ============================================================= */
import { getPool, sql } from './db';
import type { ChatMessage, Conversation } from './types';

export type ConvProvider = 'whatsapp' | 'telegram';

const nv = (n: number) => sql.NVarChar(n);
const MAX = sql.NVarChar(sql.MAX);

const clip = (v: unknown, n: number): string | null => (v == null || v === '' ? null : String(v).slice(0, n));
const num = (v: unknown): number | null => {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const int = (v: unknown): number | null => {
  const n = num(v);
  return n == null ? null : Math.trunc(n);
};
const parseJson = <T>(v: unknown): T | undefined => {
  if (typeof v !== 'string' || !v) return undefined;
  try { return JSON.parse(v) as T; } catch { return undefined; }
};

/* ── cache: apa yang SUDAH tersimpan di database, per perusahaan ── */
interface Entry { contact: string; meta: string; msgCount: number }
const g = globalThis as unknown as {
  __idtaiConvCache?: Map<string, Map<string, Entry>>;
  __idtaiConvRunning?: Set<string>;
  __idtaiConvAgain?: Set<string>;
};
const caches = (g.__idtaiConvCache ??= new Map());
const running = (g.__idtaiConvRunning ??= new Set());
const again = (g.__idtaiConvAgain ??= new Set());
const cacheOf = (orgId: string) => {
  let c = caches.get(orgId);
  if (!c) caches.set(orgId, (c = new Map()));
  return c;
};

const KNOWN = [
  'chatId', 'name', 'username', 'initials', 'phone', 'email', 'introSent', 'handledBy', 'lastMessageText',
  'lastMessageTime', 'unread', 'messages', 'provider', 'scheduling', 'escalated', 'escalationReason',
  'escalatedAt', 'picId', 'picName',
];

function contactVals(c: Conversation): unknown[] {
  return [clip(c.name, 255), clip(c.username, 100), clip(c.initials, 10), clip(c.phone, 50), clip(c.email, 255)];
}

function metaVals(c: Conversation): unknown[] {
  const rest: Record<string, unknown> = {};
  for (const k of Object.keys(c)) if (!KNOWN.includes(k)) rest[k] = (c as unknown as Record<string, unknown>)[k];
  return [
    c.handledBy === 'human' ? 'human' : 'ai',
    !!c.introSent,
    int(c.unread) ?? 0,
    c.escalated == null ? null : !!c.escalated,
    clip(c.escalationReason, 500),
    num(c.escalatedAt),
    int(c.picId),
    clip(c.picName, 200),
    c.lastMessageText ?? '',
    num(c.lastMessageTime),
    c.scheduling ? JSON.stringify(c.scheduling) : null,
    Object.keys(rest).length ? JSON.stringify(rest) : null,
  ];
}

const hash = (v: unknown[]) => JSON.stringify(v);
const keyOf = (prov: ConvProvider, chatId: string) => `${prov}:${chatId}`;

/* ── simpan ──────────────────────────────────────────────────── */
interface Work {
  prov: ConvProvider;
  chatId: string;
  key: string;
  isNew: boolean;
  contact: unknown[]; contactHash: string; writeContact: boolean;
  meta: unknown[]; metaHash: string; writeMeta: boolean;
  startSeq: number;           // jumlah pesan yang sudah tersimpan
  msgs: ChatMessage[];        // pesan baru (snapshot saat diff)
}

function diff(orgId: string, prov: ConvProvider, map: Map<string, Conversation>, out: Work[]) {
  const cache = cacheOf(orgId);
  for (const [chatId, conv] of map) {
    const key = keyOf(prov, chatId);
    const prev = cache.get(key);
    const contact = contactVals(conv);
    const meta = metaVals(conv);
    const contactHash = hash(contact);
    const metaHash = hash(meta);
    const startSeq = prev?.msgCount ?? 0;
    const msgs = conv.messages.length > startSeq ? conv.messages.slice(startSeq) : [];
    const writeContact = !prev || prev.contact !== contactHash;
    const writeMeta = !prev || prev.meta !== metaHash;
    if (!writeContact && !writeMeta && msgs.length === 0) continue;
    out.push({ prov, chatId, key, isNew: !prev, contact, contactHash, writeContact, meta, metaHash, writeMeta, startSeq, msgs });
  }
}

const SQL_CONTACT = `MERGE dbo.Contacts AS t
  USING (SELECT @org AS OrganizationId, @prov AS Provider, @chat AS ExternalId) AS s
    ON t.OrganizationId = s.OrganizationId AND t.Provider = s.Provider AND t.ExternalId = s.ExternalId
  WHEN MATCHED THEN UPDATE SET Name = @name, Username = @username, Initials = @initials, Phone = @phone, Email = @email, UpdatedAt = SYSUTCDATETIME()
  WHEN NOT MATCHED THEN INSERT (OrganizationId, Provider, ExternalId, Name, Username, Initials, Phone, Email)
    VALUES (@org, @prov, @chat, @name, @username, @initials, @phone, @email);`;

const SQL_CONV = `MERGE dbo.Conversations AS t
  USING (SELECT @org AS OrganizationId, @prov AS Provider, @chat AS ChatId) AS s
    ON t.OrganizationId = s.OrganizationId AND t.Provider = s.Provider AND t.ChatId = s.ChatId
  WHEN MATCHED THEN UPDATE SET HandledBy = @handled, IntroSent = @intro, Unread = @unread, Escalated = @esc,
    EscalationReason = @escReason, EscalatedAt = @escAt, PicId = @picId, PicName = @picName,
    LastMessageText = @lastText, LastMessageTime = @lastTime, Scheduling = @sched, Extra = @extra, UpdatedAt = SYSUTCDATETIME()
  WHEN NOT MATCHED THEN INSERT (OrganizationId, Provider, ChatId, HandledBy, IntroSent, Unread, Escalated, EscalationReason,
    EscalatedAt, PicId, PicName, LastMessageText, LastMessageTime, Scheduling, Extra)
    VALUES (@org, @prov, @chat, @handled, @intro, @unread, @esc, @escReason, @escAt, @picId, @picName, @lastText, @lastTime, @sched, @extra);`;

const SQL_MSG = `IF NOT EXISTS (SELECT 1 FROM dbo.ChatMessages WHERE OrganizationId = @org AND Provider = @prov AND ChatId = @chat AND Seq = @seq)
  INSERT INTO dbo.ChatMessages (OrganizationId, Provider, ChatId, Seq, MsgId, Dir, Sender, Body, SentAt)
  VALUES (@org, @prov, @chat, @seq, @msgId, @dir, @sender, @body, @sentAt);`;

const CHUNK = 40; // jumlah percakapan per transaksi

async function write(orgId: string, work: Work[]) {
  const pool = await getPool();
  const cache = cacheOf(orgId);
  for (let i = 0; i < work.length; i += CHUNK) {
    const part = work.slice(i, i + CHUNK);
    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      for (const w of part) {
        const base = () => new sql.Request(tx).input('org', sql.UniqueIdentifier, orgId).input('prov', nv(20), w.prov).input('chat', nv(100), w.chatId);
        // Kontak harus ada sebelum percakapan, dan percakapan sebelum pesan (foreign key).
        if (w.writeContact || w.isNew) {
          const [name, username, initials, phone, email] = w.contact;
          await base().input('name', nv(255), name).input('username', nv(100), username).input('initials', nv(10), initials)
            .input('phone', nv(50), phone).input('email', nv(255), email).query(SQL_CONTACT);
        }
        if (w.writeMeta || w.isNew) {
          const [handled, intro, unread, esc, escReason, escAt, picId, picName, lastText, lastTime, sched, extra] = w.meta;
          await base().input('handled', nv(10), handled).input('intro', sql.Bit, intro).input('unread', sql.Int, unread)
            .input('esc', sql.Bit, esc).input('escReason', nv(500), escReason).input('escAt', sql.BigInt, escAt)
            .input('picId', sql.Int, picId).input('picName', nv(200), picName).input('lastText', MAX, lastText)
            .input('lastTime', sql.BigInt, lastTime).input('sched', MAX, sched).input('extra', MAX, extra).query(SQL_CONV);
        }
        for (let m = 0; m < w.msgs.length; m++) {
          const msg = w.msgs[m];
          await base().input('seq', sql.Int, w.startSeq + m + 1).input('msgId', sql.Int, int(msg.id))
            .input('dir', nv(3), msg.dir === 'out' ? 'out' : 'in')
            .input('sender', nv(10), ['user', 'ai', 'human', 'system'].includes(msg.from) ? msg.from : 'system')
            .input('body', MAX, msg.text ?? '').input('sentAt', sql.BigInt, num(msg.time) ?? Date.now()).query(SQL_MSG);
        }
      }
      await tx.commit();
    } catch (e) {
      await tx.rollback().catch(() => {});
      throw e; // cache tidak diubah -> sapuan berikutnya mengulang bagian ini
    }
    for (const w of part) {
      cache.set(w.key, { contact: w.contactHash, meta: w.metaHash, msgCount: w.startSeq + w.msgs.length });
    }
  }
}

/** Simpan perubahan percakapan satu perusahaan. Aman dipanggil sering & bersamaan (digabung). */
export async function saveConversations(
  orgId: string,
  waba: Map<string, Conversation>,
  telegram: Map<string, Conversation>
): Promise<void> {
  if (running.has(orgId)) { again.add(orgId); return; }
  running.add(orgId);
  try {
    do {
      again.delete(orgId);
      const work: Work[] = [];
      diff(orgId, 'whatsapp', waba, work);
      diff(orgId, 'telegram', telegram, work);
      if (work.length) await write(orgId, work);
    } while (again.has(orgId));
  } finally {
    running.delete(orgId);
  }
}

/* ── muat ────────────────────────────────────────────────────── */
export async function loadConversations(orgId: string): Promise<{ whatsapp: Conversation[]; telegram: Conversation[] }> {
  const pool = await getPool();
  const q = (text: string) => pool.request().input('org', sql.UniqueIdentifier, orgId).query(text);
  const [contacts, convs, msgs] = await Promise.all([
    q(`SELECT Provider, ExternalId, Name, Username, Initials, Phone, Email FROM dbo.Contacts WHERE OrganizationId = @org`),
    q(`SELECT Provider, ChatId, HandledBy, IntroSent, Unread, Escalated, EscalationReason, EscalatedAt, PicId, PicName,
              LastMessageText, LastMessageTime, Scheduling, Extra FROM dbo.Conversations WHERE OrganizationId = @org`),
    q(`SELECT Provider, ChatId, Seq, MsgId, Dir, Sender, Body, SentAt FROM dbo.ChatMessages WHERE OrganizationId = @org ORDER BY Provider, ChatId, Seq`),
  ]);

  const contactBy = new Map<string, any>();
  for (const r of contacts.recordset) contactBy.set(keyOf(r.Provider, r.ExternalId), r);

  const byKey = new Map<string, Conversation>();
  const out = { whatsapp: [] as Conversation[], telegram: [] as Conversation[] };
  for (const r of convs.recordset) {
    const prov = r.Provider as ConvProvider;
    const k = keyOf(prov, r.ChatId);
    const ct = contactBy.get(k);
    const extra = parseJson<Record<string, unknown>>(r.Extra) ?? {};
    const conv: Conversation = {
      ...extra,
      chatId: r.ChatId,
      name: ct?.Name ?? r.ChatId,
      phone: ct?.Phone ?? '',
      introSent: !!r.IntroSent,
      handledBy: r.HandledBy === 'human' ? 'human' : 'ai',
      lastMessageText: r.LastMessageText ?? '',
      lastMessageTime: Number(r.LastMessageTime ?? 0),
      unread: Number(r.Unread ?? 0),
      messages: [],
      provider: prov,
    } as Conversation;
    if (ct?.Username != null) conv.username = ct.Username;
    if (ct?.Initials != null) conv.initials = ct.Initials;
    if (ct?.Email != null) conv.email = ct.Email;
    if (r.Escalated != null) conv.escalated = !!r.Escalated;
    if (r.EscalationReason != null) conv.escalationReason = r.EscalationReason;
    if (r.EscalatedAt != null) conv.escalatedAt = Number(r.EscalatedAt);
    if (r.PicId != null) conv.picId = Number(r.PicId);
    if (r.PicName != null) conv.picName = r.PicName;
    const sched = parseJson<Conversation['scheduling']>(r.Scheduling);
    if (sched) conv.scheduling = sched;
    byKey.set(k, conv);
    out[prov].push(conv);
  }

  for (const m of msgs.recordset) {
    const conv = byKey.get(keyOf(m.Provider, m.ChatId));
    if (!conv) continue;
    conv.messages.push({
      id: m.MsgId ?? Number(m.Seq),
      dir: m.Dir === 'out' ? 'out' : 'in',
      from: m.Sender,
      text: m.Body ?? '',
      time: Number(m.SentAt),
    } as ChatMessage);
  }

  // Cache = kondisi database saat ini, supaya sapuan pertama tidak menulis ulang apa pun.
  const cache = new Map<string, Entry>();
  caches.set(orgId, cache);
  for (const [k, conv] of byKey) cache.set(k, { contact: hash(contactVals(conv)), meta: hash(metaVals(conv)), msgCount: conv.messages.length });
  return out;
}

/** Dipakai pengujian. */
export const __conv = { caches, contactVals, metaVals };
