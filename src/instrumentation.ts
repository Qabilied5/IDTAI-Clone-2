/* =============================================================
   src/instrumentation.ts
   Hook resmi Next.js yang dijalankan SEKALI saat server boot — dipakai
   sebagai pengganti app.listen() di server.js untuk menyalakan polling
   Telegram, cek stall, dan polling Calendly. Hanya di runtime Node.js
   (bukan Edge). Aktifkan lewat next.config.js:
     experimental: { instrumentationHook: true }
   ============================================================= */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startBackgroundJobs } = await import('./server/jobs');
    startBackgroundJobs();
  }
}
