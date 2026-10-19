/* =============================================================
   src/server/store.ts
   Persistensi data bisnis per perusahaan — Knowledge Base, PIC/agent, pengaturan
   eskalasi, identitas agent, pipeline, appointment.
   - Sumber utama: SQL Server (tabel dari 007, lewat org-repo.ts). Dimuat ke `state`
     saat boot (loadOrgDataIntoState, dipanggil dari integration-sync.ts).
   - File JSON lama di data/ diimpor SEKALI per perusahaan (hanya untuk koleksi yang
     masih kosong di database), ditandai di dbo.OrgDataMigrations.
   - Jika database tidak terbaca saat boot, perusahaan itu bekerja dari file JSON
     (dan menulis ke file) sampai server direstart — database tidak pernah ditimpa
     dengan data setengah-jadi.
   ============================================================= */
import fs from 'fs';
import path from 'path';
import {
  AGENTS_DATA_FILE, DATA_DIR, ESCALATION_SETTINGS_FILE, IDENTITY_DATA_FILE, KB_DATA_FILE, KB_UPLOADS_DIR,
  PIPELINE_DATA_FILE,
} from './config';
import { getDefaultOrgId, orgIdOrDefault } from './org-context';
import * as repo from './org-repo';
import { state } from './state';

type Key = 'knowledgeBase' | 'picAgents' | 'escalationSettings' | 'companyIntro' | 'pipeline' | 'appointments';

const FILE_OF: Record<Key, string> = {
  knowledgeBase: KB_DATA_FILE,
  picAgents: AGENTS_DATA_FILE,
  escalationSettings: ESCALATION_SETTINGS_FILE,
  companyIntro: IDENTITY_DATA_FILE,
  pipeline: PIPELINE_DATA_FILE,
  appointments: path.join(DATA_DIR, 'appointments.json'),
};
const LEGACY_KEYS: Key[] = ['knowledgeBase', 'picAgents', 'escalationSettings', 'companyIntro', 'pipeline'];
const MIGRATION_NAME = 'json-files-v1';

const gS = globalThis as unknown as { __idtaiDbDown?: Set<string> };
const dbDown: Set<string> = (gS.__idtaiDbDown ??= new Set());

/* Perusahaan DEFAULT memakai file lama (data/*.json); perusahaan lain data/orgs/<orgId>/*.json. */
function orgFile(file: string): string {
  const orgId = orgIdOrDefault();
  const def = getDefaultOrgId();
  if (orgId === 'default' || (def && orgId === def)) return file;
  return path.join(DATA_DIR, 'orgs', orgId, path.basename(file));
}

function ensureDirs() {
  fs.mkdirSync(KB_UPLOADS_DIR, { recursive: true });
}

function readJsonFile<T>(file: string, label: string): T | null {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch (e) {
    console.error(`[${label}] Gagal membaca ${file}:`, (e as Error).message);
  }
  return null;
}

function writeJsonFile(file: string, data: unknown, label: string) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(`[${label}] Gagal menyimpan ${file}:`, (e as Error).message);
  }
}

/* ── nilai ↔ state (bentuk file lama) ─────────────────────────── */
function currentValue(key: Key): unknown {
  switch (key) {
    case 'knowledgeBase': return state.knowledgeBase;
    case 'picAgents': return state.picAgents;
    case 'escalationSettings': return state.escalationSettings;
    case 'companyIntro': return state.companyIntro;
    case 'pipeline': return { deals: state.pipelineDeals, stages: state.pipelineStages };
    case 'appointments': return state.aiAppointments;
  }
}

function applyEscalation(v: any) {
  state.escalationSettings = {
    ...state.escalationSettings,
    ...v,
    triggers: { ...state.escalationSettings.triggers, ...(v.triggers || {}) },
  };
}

function applyIdentity(v: any) {
  if (v.botName) state.companyIntro.botName = v.botName;
  if (v.companyName) state.companyIntro.companyName = v.companyName;
}

function applyLegacy(key: Key, v: any) {
  if (!v) return;
  switch (key) {
    case 'knowledgeBase': if (Array.isArray(v)) state.knowledgeBase = v; break;
    case 'picAgents': if (Array.isArray(v)) state.picAgents = v; break;
    case 'escalationSettings': applyEscalation(v); break;
    case 'companyIntro': applyIdentity(v); break;
    case 'pipeline':
      if (Array.isArray(v.deals)) state.pipelineDeals = v.deals;
      if (Array.isArray(v.stages) && v.stages.length > 0) state.pipelineStages = v.stages;
      break;
    case 'appointments': if (Array.isArray(v)) state.aiAppointments = v; break;
  }
}

/* ── simpan ───────────────────────────────────────────────────── */
function persist(key: Key) {
  const orgId = orgIdOrDefault();
  if (dbDown.has(orgId)) {
    // Database tidak terbaca saat boot: jangan sentuh database, tulis ke file.
    writeJsonFile(orgFile(FILE_OF[key]), currentValue(key), key);
    return;
  }
  switch (key) {
    case 'knowledgeBase': repo.saveKb(orgId, state.knowledgeBase); break;
    case 'picAgents': repo.savePic(orgId, state.picAgents); break;
    case 'escalationSettings': repo.saveEscalation(orgId, state.escalationSettings); break;
    case 'companyIntro': repo.saveIdentity(orgId, state.companyIntro); break;
    case 'pipeline':
      repo.saveStages(orgId, state.pipelineStages);
      repo.saveDeals(orgId, state.pipelineDeals);
      break;
    case 'appointments': repo.saveAppointments(orgId, state.aiAppointments); break;
  }
}

export function kbSave() { persist('knowledgeBase'); }
export function picSave() { persist('picAgents'); }
export function escSave() { persist('escalationSettings'); }
export function agentIdentitySave() { persist('companyIntro'); }
export function pipelineSave() { persist('pipeline'); }
/* Appointment: dipanggil setelah dibuat/diubah, dan disapu berkala oleh jobs.ts sebagai pengaman. */
export function apptSave() { persist('appointments'); }

/* ── muat ─────────────────────────────────────────────────────── */

function loadFromFilesSync() {
  for (const key of LEGACY_KEYS) applyLegacy(key, readJsonFile<any>(orgFile(FILE_OF[key]), key));
  applyLegacy('appointments', readJsonFile<any>(orgFile(FILE_OF.appointments), 'appointments'));
}

/* Dipanggil sekali per perusahaan saat boot (di dalam runWithOrg). */
export async function loadOrgDataIntoState(): Promise<void> {
  if (state.dataLoaded) return;
  ensureDirs();
  const orgId = orgIdOrDefault();

  try {
    const [pic, stages, deals, kb, appts, esc, identity, migrated] = await Promise.all([
      repo.loadPic(orgId),
      repo.loadStages(orgId),
      repo.loadDeals(orgId),
      repo.loadKb(orgId),
      repo.loadAppointments(orgId),
      repo.loadEscalation(orgId),
      repo.loadIdentity(orgId),
      repo.hasMigration(orgId, MIGRATION_NAME),
    ]);

    if (pic.length) state.picAgents = pic;
    if (stages.length) state.pipelineStages = stages;
    if (stages.length || deals.length) state.pipelineDeals = deals;
    if (kb.length) state.knowledgeBase = kb;
    if (appts.length) state.aiAppointments = appts;
    if (esc) applyEscalation(esc);
    if (identity) applyIdentity(identity);

    // Impor file JSON lama — hanya sekali, dan hanya untuk koleksi yang masih kosong di database.
    if (!migrated) {
      const todo: Array<[Key, boolean]> = [
        ['knowledgeBase', kb.length === 0],
        ['picAgents', pic.length === 0],
        ['escalationSettings', esc === null],
        ['companyIntro', identity === null],
        ['pipeline', stages.length === 0 && deals.length === 0],
      ];
      for (const [key, empty] of todo) {
        if (!empty) continue;
        const v = readJsonFile<any>(orgFile(FILE_OF[key]), key);
        if (!v) continue;
        applyLegacy(key, v);
        persist(key);
        console.log(`[Store] ${key} diimpor dari file ke database`);
      }
      await repo.flushAll();
      if (!repo.hasPending()) await repo.markMigrated(orgId, MIGRATION_NAME);
    }
  } catch (e) {
    console.error('[Store] Database tidak terbaca — bekerja dari file JSON sampai server direstart:', (e as Error).message);
    dbDown.add(orgId);
    loadFromFilesSync();
  }
  state.dataLoaded = true;
}

/* Pengaman sinkron — dipanggil dari banyak modul. Setelah boot normal sudah no-op;
   untuk perusahaan yang baru dibuat (belum punya data) cukup baca file bila ada. */
export function ensureDataLoaded() {
  if (state.dataLoaded) return;
  state.dataLoaded = true;
  ensureDirs();
  loadFromFilesSync();
}
