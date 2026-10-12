/* fetch ke API eksternal (Ollama/Telegram/Meta/Calendly). Next.js men-patch
   fetch dengan caching untuk request GET — untuk API pihak ketiga itu justru
   berbahaya (status/polling bisa basi), jadi selalu dipaksa no-store. */
export function xfetch(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, { ...init, cache: 'no-store' });
}
