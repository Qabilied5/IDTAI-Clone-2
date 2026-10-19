/* Bentuk data dari /api/knowledge-base (lihat kbPublicDoc di server/knowledge-base.ts). */

export type KbStatus = "aktif" | "nonaktif" | "draft";
export type KbSourceType = "file" | "url" | "teks";
export type KbCategory = "produk" | "harga" | "faq" | "sop" | "pengiriman" | "umum";

export interface KbDoc {
  id: number;
  title: string;
  category: string;
  status: KbStatus;
  sourceType: KbSourceType;
  fileName: string | null;
  fileExt: string | null;
  sizeBytes: number;
  url: string | null;
  autoSync: boolean;
  crawlBatchId: string | null;
  createdAt: number;
  updatedAt: number;
  contentLength: number;
  contentPreview: string;
  extractFailed: boolean;
  aiFiltered: boolean | null;
  aiFilterNote: string | null;
}

/** Dokumen lengkap (GET /knowledge-base/:id) — menyertakan isi teks yang dipakai AI. */
export interface KbDocFull extends KbDoc {
  content: string;
}

export type CrawlStatus = "running" | "done" | "error" | "cancelled";

export interface CrawlJob {
  id: string;
  status: CrawlStatus;
  startUrl: string;
  pagesVisited: number;
  maxPages: number;
  currentUrl: string;
  docsCreated: number;
  errors: string[];
  error?: string;
  aiFilterTotalPages: number;
  aiFilterFailedPages: number;
  startedAt: number;
  finishedAt?: number;
}

export interface CrawlOptions {
  url: string;
  category: string;
  maxPages: number;
  maxDepth: number;
  sameDomainOnly: boolean;
  aiFilter: boolean;
}
