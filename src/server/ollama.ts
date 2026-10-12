/* =============================================================
   src/server/ollama.ts
   Wrapper panggilan Ollama /api/generate (teks bebas & JSON terstruktur).
   ============================================================= */
import { KB_OLLAMA_REACHABLE_TTL_MS, OLLAMA_BASE_URL, OLLAMA_MODEL } from './config';
import { xfetch } from './fetch';
import { state } from './state';

export function extractJson(raw: string): string {
  const cleaned = raw.trim().replace(/^```json\s*|\s*```$/g, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) return cleaned;
  return cleaned.slice(start, end + 1);
}

interface GenerateOpts {
  model?: string;
  temperature?: number;
  num_ctx?: number;
  format?: 'json';
  signal?: AbortSignal;
}

export async function ollamaGenerate(prompt: string, opts: GenerateOpts = {}): Promise<string> {
  const body: Record<string, unknown> = {
    model: opts.model || OLLAMA_MODEL,
    prompt,
    stream: false,
    options: { temperature: opts.temperature ?? 0.7, ...(opts.num_ctx ? { num_ctx: opts.num_ctx } : {}) },
  };
  if (opts.format) body.format = opts.format;

  const res = await xfetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: opts.signal,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ollama error ${res.status}: ${text}`);
  }
  const data = await res.json();
  return String(data.response || '').trim();
}

export async function ollamaGenerateJson<T = any>(prompt: string, opts: GenerateOpts = {}): Promise<T> {
  const raw = await ollamaGenerate(prompt, { ...opts, format: 'json' });
  return JSON.parse(extractJson(raw)) as T;
}

export async function ollamaReachable(): Promise<boolean> {
  try {
    const r = await xfetch(`${OLLAMA_BASE_URL}/api/tags`);
    return r.ok;
  } catch {
    return false;
  }
}

/* Versi ber-cache singkat (dipakai crawl KB) — kalau Ollama mati, langsung
   tahu di awal, bukan nunggu timeout 45 detik per batch per halaman. */
export async function ollamaReachableCached(): Promise<boolean> {
  const now = Date.now();
  const c = state.kbOllamaReachableCache;
  if (c.ok !== null && now - c.checkedAt < KB_OLLAMA_REACHABLE_TTL_MS) return c.ok;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const r = await xfetch(`${OLLAMA_BASE_URL}/api/tags`, { signal: controller.signal });
    clearTimeout(timer);
    state.kbOllamaReachableCache = { ok: r.ok, checkedAt: now };
    return r.ok;
  } catch {
    state.kbOllamaReachableCache = { ok: false, checkedAt: now };
    return false;
  }
}
