import { apiFetch } from "@/lib/api";
import type { CrawlJob, CrawlOptions, KbDoc, KbDocFull, KbStatus } from "@/types/knowledge-base";

/* Semua pemanggilan ke /api/knowledge-base/*. Backend selalu membalas { ok, ... };
   error HTTP sudah dilempar oleh apiFetch sebagai ApiError(message). */

export const kbApi = {
  list: () => apiFetch<{ docs: KbDoc[] }>("/knowledge-base").then((d) => d.docs ?? []),

  get: (id: number | string) =>
    apiFetch<{ doc: KbDocFull }>(`/knowledge-base/${id}`).then((d) => d.doc),

  update: (id: number, body: { title: string; content: string; category: string }) =>
    apiFetch(`/knowledge-base/${id}`, { method: "PUT", body: JSON.stringify(body) }),

  remove: (id: number | string) => apiFetch(`/knowledge-base/${id}`, { method: "DELETE" }),

  bulkRemove: (ids: number[]) =>
    apiFetch<{ deletedCount: number }>("/knowledge-base/bulk-delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),

  setStatus: (id: number | string, status: KbStatus) =>
    apiFetch(`/knowledge-base/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  addText: (body: { title: string; content: string; category: string }) =>
    apiFetch("/knowledge-base/text", { method: "POST", body: JSON.stringify(body) }),

  upload: (files: File[], category: string) => {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    fd.append("category", category);
    return apiFetch<{ docs: KbDoc[] }>("/knowledge-base/upload", { method: "POST", body: fd });
  },

  addUrl: (body: { url: string; category: string; autoSync: boolean; aiFilter: boolean }) =>
    apiFetch<{ doc: KbDoc; aiFilterWarning?: string | null }>("/knowledge-base/url", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  startCrawl: (opts: CrawlOptions) =>
    apiFetch<{ jobId: string }>("/knowledge-base/crawl", { method: "POST", body: JSON.stringify(opts) }),

  crawlStatus: (jobId: string) =>
    apiFetch<{ job: CrawlJob }>(`/knowledge-base/crawl/${jobId}`).then((d) => d.job),

  cancelCrawl: (jobId: string) =>
    apiFetch(`/knowledge-base/crawl/${jobId}/cancel`, { method: "POST" }),
};
