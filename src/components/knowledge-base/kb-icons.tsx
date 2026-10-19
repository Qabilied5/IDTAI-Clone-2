import type { LucideIcon } from "lucide-react";
import {
  Box, File, FileSpreadsheet, FileText, Globe, ListChecks, MessageCircleQuestion, StickyNote, Tag, Truck,
} from "lucide-react";

import type { KbDoc } from "@/types/knowledge-base";

export const CAT_ICON: Record<string, LucideIcon> = {
  produk: Box,
  harga: Tag,
  faq: MessageCircleQuestion,
  sop: ListChecks,
  pengiriman: Truck,
  umum: File,
};

/** Ikon sumber dokumen: URL / teks langsung / tipe file. */
export function SrcIcon({ doc }: { doc: Pick<KbDoc, "sourceType" | "fileExt"> }) {
  if (doc.sourceType === "url") return <Globe aria-hidden />;
  if (doc.sourceType === "teks") return <StickyNote aria-hidden />;
  const ext = (doc.fileExt ?? "").toLowerCase();
  if (["xlsx", "xls", "csv"].includes(ext)) return <FileSpreadsheet aria-hidden />;
  if (["pdf", "docx", "txt"].includes(ext)) return <FileText aria-hidden />;
  return <File aria-hidden />;
}

/* Ikon aksi kartu — SVG yang sama dengan KB_ICONS di knowledge-base.js referensi. */
const svgProps = {
  width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true,
} as const;

export const IconPreview = () => (
  <svg {...svgProps}><path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></svg>
);
export const IconEdit = () => (
  <svg {...svgProps}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
export const IconDelete = () => (
  <svg {...svgProps}>
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
  </svg>
);
export const IconActivate = () => (
  <svg {...svgProps}><polygon points="5 3 19 12 5 21 5 3" /></svg>
);
