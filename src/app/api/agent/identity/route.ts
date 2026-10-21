import { agentSetIdentity, type IdentityInput } from '@/server/agents';
import { fail, ok, readJson } from '@/server/http';
import { state } from '@/server/state';
import { ensureDataLoaded } from '@/server/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TONES = ['formal', 'santai', 'industri', 'custom'] as const;
const TEXT_LIMITS: Record<'botName' | 'companyName' | 'companyDesc' | 'roleTitle' | 'tagline' | 'sop', number> = {
  botName: 100,
  companyName: 150,
  companyDesc: 4000,
  roleTitle: 100,
  tagline: 200,
  sop: 2000,
};
const BOOLS = ['langId', 'langAuto', 'greetName'] as const;

/* GET — identitas & persona milik perusahaan yang sedang login (di-resolve lewat konteks tenant). */
export async function GET() {
  ensureDataLoaded();
  return ok({ identity: { ...state.companyIntro } });
}

/* POST — simpan identitas & persona. Semua field opsional, tetapi minimal satu harus ada. */
export async function POST(req: Request) {
  const body = await readJson(req);
  const input: IdentityInput = {};

  for (const key of Object.keys(TEXT_LIMITS) as (keyof typeof TEXT_LIMITS)[]) {
    const v = body[key];
    if (v === undefined) continue;
    if (typeof v !== 'string') return fail(`${key} harus berupa teks`, 400);
    const t = v.trim();
    if (t.length > TEXT_LIMITS[key]) return fail(`${key} maksimal ${TEXT_LIMITS[key]} karakter`, 400);
    input[key] = t;
  }
  if (body.tone !== undefined) {
    if (!TONES.includes(body.tone)) return fail('tone tidak valid', 400);
    input.tone = body.tone;
  }
  for (const key of BOOLS) {
    if (body[key] === undefined) continue;
    if (typeof body[key] !== 'boolean') return fail(`${key} harus true/false`, 400);
    input[key] = body[key];
  }

  if (Object.keys(input).length === 0) return fail('Tidak ada data identitas yang dikirim', 400);
  if (input.botName === '' && input.companyName === '' && Object.keys(input).length === 2) {
    return fail('botName atau companyName wajib diisi', 400);
  }
  return ok({ identity: agentSetIdentity(input) });
}
