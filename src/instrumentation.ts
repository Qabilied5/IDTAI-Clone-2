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
    // Muat perusahaan + kredensial channel dari SQL Server DULU, supaya polling
    // Telegram/Calendly yang dimulai di bawah memakai token milik tiap perusahaan.
    try {
      const { loadIntegrationsIntoState } = await import('./server/integration-sync');
      await loadIntegrationsIntoState();
    } catch (err) {
      console.error('[Integrasi] Gagal memuat dari database, pakai nilai .env:', (err as Error).message);
    }

    const { startBackgroundJobs } = await import('./server/jobs');
    startBackgroundJobs();
  }
}
