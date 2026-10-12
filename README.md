# IDTAI-CLONE — Indotrading AI Admin Dashboard

Port backend `server.js` (IDT-AI) ke Next.js 14 App Router.

## Jalankan lokal
```bash
cp .env.example .env
npm install
npm run dev        # http://localhost:3000
```

## Struktur
- `src/app/(dashboard)/*` — halaman dashboard (overview, percakapan, integrasi sudah jadi; sisanya placeholder)
- `src/app/api/*` — Route Handler (waba, telegram, agents, appointments, calendly, knowledge-base, followup, escalation)
- `src/server/*` — logika backend hasil port server.js (state, store JSON di `data/`, ollama, waba, telegram, calendly)
- `src/instrumentation.ts` — background jobs saat server boot (polling Telegram, cek stall, polling Calendly)

## Deploy
Self-hosted Node single process: `npm run build && npm start`.
