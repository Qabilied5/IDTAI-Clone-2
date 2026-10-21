/* =============================================================
   src/server/agents.ts
   PIC / human agent (halaman Pengaturan Agent + dropdown "Ambil Alih")
   + identitas agent (nama bot & perusahaan untuk sapaan).
   ============================================================= */
import { state } from './state';
import { agentIdentitySave, ensureDataLoaded, picSave } from './store';
import type { PicAgent } from './types';

export function picNextId(): number {
  ensureDataLoaded();
  return state.picAgents.reduce((max, a) => Math.max(max, a.id), 0) + 1;
}

export function picInitials(name: string): string {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?';
}

export function picAvailableAgents(): PicAgent[] {
  ensureDataLoaded();
  // 'viewer' read-only, tidak masuk antrian.
  return state.picAgents.filter((a) => a.status === 'online' && a.role !== 'viewer');
}

/* Fair queue: least-busy dulu; kalau seri, bergiliran pakai picQueuePointer. */
export function picPickNextAgent(): PicAgent | null {
  const pool = picAvailableAgents();
  if (!pool.length) return null;
  const minChat = Math.min(...pool.map((a) => a.chat || 0));
  const leastBusy = pool.filter((a) => (a.chat || 0) === minChat);
  const agent = leastBusy[state.picQueuePointer % leastBusy.length];
  state.picQueuePointer = (state.picQueuePointer + 1) % pool.length;
  return agent;
}

export function picCreate(input: { nama: string; email: string; role?: string }): PicAgent {
  const agent: PicAgent = {
    id: picNextId(),
    nama: input.nama,
    email: input.email,
    role: input.role || 'agent',
    status: 'offline',
    initials: picInitials(input.nama),
    chat: 0,
  };
  state.picAgents.push(agent);
  picSave();
  return agent;
}

export function picUpdate(id: number, body: Partial<PicAgent>): PicAgent | null {
  ensureDataLoaded();
  const agent = state.picAgents.find((a) => a.id === id);
  if (!agent) return null;
  if (body.nama !== undefined) { agent.nama = String(body.nama).trim(); agent.initials = picInitials(agent.nama); }
  if (body.email !== undefined) agent.email = String(body.email).trim();
  if (body.role !== undefined) agent.role = body.role;
  if (body.status !== undefined) agent.status = body.status;
  picSave();
  return agent;
}

export function picDelete(id: number): boolean {
  ensureDataLoaded();
  const idx = state.picAgents.findIndex((a) => a.id === id);
  if (idx === -1) return false;
  state.picAgents.splice(idx, 1);
  picSave();
  return true;
}

export interface IdentityInput {
  botName?: string;
  companyName?: string;
  companyDesc?: string;
  tone?: 'formal' | 'santai' | 'industri' | 'custom';
  roleTitle?: string;
  tagline?: string;
  sop?: string;
  langId?: boolean;
  langAuto?: boolean;
  greetName?: boolean;
}

/* Identitas & persona agent milik perusahaan yang sedang aktif (tersimpan di dbo.AgentIdentity).
   botName/companyName tidak boleh dikosongkan; field teks lain boleh dikosongkan (= menghapus). */
export function agentSetIdentity(input: IdentityInput) {
  ensureDataLoaded();
  const ci = state.companyIntro;
  if (typeof input.botName === 'string' && input.botName.trim()) ci.botName = input.botName.trim();
  if (typeof input.companyName === 'string' && input.companyName.trim()) ci.companyName = input.companyName.trim();
  if (typeof input.companyDesc === 'string') ci.companyDesc = input.companyDesc.trim();
  if (typeof input.roleTitle === 'string') ci.roleTitle = input.roleTitle.trim();
  if (typeof input.tagline === 'string') ci.tagline = input.tagline.trim();
  if (typeof input.sop === 'string') ci.sop = input.sop.trim();
  if (input.tone) ci.tone = input.tone;
  if (typeof input.langId === 'boolean') ci.langId = input.langId;
  if (typeof input.langAuto === 'boolean') ci.langAuto = input.langAuto;
  if (typeof input.greetName === 'boolean') ci.greetName = input.greetName;
  agentIdentitySave();
  return { ...ci };
}
