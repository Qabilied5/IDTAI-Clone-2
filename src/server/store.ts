/* =============================================================
   src/server/store.ts
   Persistensi file JSON di data/ — Knowledge Base, PIC/agent, pengaturan
   eskalasi, identitas agent. Pola sama dengan server.js (tanpa database).
   ============================================================= */
import fs from 'fs';
import path from 'path';
import {
  AGENTS_DATA_FILE, DATA_DIR, ESCALATION_SETTINGS_FILE, IDENTITY_DATA_FILE, KB_DATA_FILE, KB_UPLOADS_DIR,
  PIPELINE_DATA_FILE,
} from './config';
import { getDefaultOrgId, orgIdOrDefault } from './org-context';
import { state } from './state';

/* Multi-perusahaan: perusahaan DEFAULT tetap memakai file lama (data/*.json) sehingga data
   yang sudah ada tidak hilang; perusahaan lain memakai data/orgs/<orgId>/*.json. */
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

export function kbSave() { writeJsonFile(orgFile(KB_DATA_FILE), state.knowledgeBase, 'KB'); }
export function picSave() { writeJsonFile(orgFile(AGENTS_DATA_FILE), state.picAgents, 'PIC'); }
export function escSave() { writeJsonFile(orgFile(ESCALATION_SETTINGS_FILE), state.escalationSettings, 'Eskalasi'); }
export function agentIdentitySave() { writeJsonFile(orgFile(IDENTITY_DATA_FILE), state.companyIntro, 'Identity'); }
export function pipelineSave() {
  writeJsonFile(orgFile(PIPELINE_DATA_FILE), { deals: state.pipelineDeals, stages: state.pipelineStages }, 'Pipeline');
}

/* Dipanggil sekali per proses (idempotent) — dari instrumentation.ts saat
   boot, dan sebagai pengaman dari tiap modul yang butuh data. */
export function ensureDataLoaded() {
  if (state.dataLoaded) return;
  state.dataLoaded = true;
  ensureDirs();

  const kb = readJsonFile<typeof state.knowledgeBase>(orgFile(KB_DATA_FILE), 'KB');
  if (kb) state.knowledgeBase = kb;

  const agents = readJsonFile<typeof state.picAgents>(orgFile(AGENTS_DATA_FILE), 'PIC');
  if (agents) state.picAgents = agents;

  const esc = readJsonFile<any>(orgFile(ESCALATION_SETTINGS_FILE), 'Eskalasi');
  if (esc) {
    state.escalationSettings = {
      ...state.escalationSettings,
      ...esc,
      triggers: { ...state.escalationSettings.triggers, ...(esc.triggers || {}) },
    };
  }

  const identity = readJsonFile<any>(orgFile(IDENTITY_DATA_FILE), 'Identity');
  if (identity) {
    if (identity.botName) state.companyIntro.botName = identity.botName;
    if (identity.companyName) state.companyIntro.companyName = identity.companyName;
  }

  const pipeline = readJsonFile<{ deals: typeof state.pipelineDeals; stages: typeof state.pipelineStages }>(
    orgFile(PIPELINE_DATA_FILE),
    'Pipeline'
  );
  if (pipeline) {
    if (Array.isArray(pipeline.deals)) state.pipelineDeals = pipeline.deals;
    if (Array.isArray(pipeline.stages) && pipeline.stages.length > 0) state.pipelineStages = pipeline.stages;
  }
}
