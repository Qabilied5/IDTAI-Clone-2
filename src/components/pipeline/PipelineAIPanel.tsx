"use client";

import { ArrowRight, RefreshCw, Sparkles, TriangleAlert } from "lucide-react";

import { formatRupiah } from "@/lib/pipeline";
import type { PipelineDeal, PipelineInsights } from "@/types/pipeline";

import { PlIcon } from "./PlIcon";

type Priority = "urgent" | "warning" | "opportunity" | "info";

const PRIORITY_META: Record<Priority, { label: string; color: string; bg: string }> = {
  urgent: { label: "Mendesak", color: "var(--red)", bg: "var(--red-light)" },
  warning: { label: "Perhatian", color: "var(--amber)", bg: "var(--amber-bg)" },
  opportunity: { label: "Peluang", color: "var(--green)", bg: "var(--green-bg)" },
  info: { label: "Info", color: "var(--gray-600)", bg: "var(--gray-100)" },
};

/* Server mengembalikan bentuk dari prompt (deal_id, priority, reasoning, recommended_action,
   action_label), sedangkan tipe PipelineInsightItem lama memakai (dealId, type, text).
   Keduanya dibaca di sini supaya panel tetap jalan apa pun bentuknya. */
interface RawInsight {
  deal_id?: string | number;
  dealId?: string | number;
  priority?: string;
  type?: string;
  title?: string;
  reasoning?: string;
  text?: string;
  recommended_action?: string;
  action_label?: string;
}

function normalize(item: RawInsight) {
  const p = (item.priority ?? item.type ?? "info").toLowerCase();
  const priority: Priority = p in PRIORITY_META ? (p as Priority) : "info";
  const id = item.deal_id ?? item.dealId;
  return {
    priority,
    dealId: id === undefined || id === null ? null : String(id),
    title: item.title ?? "",
    reasoning: item.reasoning ?? item.text ?? "",
    action: item.recommended_action ?? "",
    actionLabel: item.action_label || "Lihat Deal",
  };
}

interface Props {
  hidden: boolean;
  insights: PipelineInsights | null;
  isLoading: boolean;
  error: string | null;
  updatedAt: Date | null;
  hasDeals: boolean;
  deals: PipelineDeal[];
  onRefresh: () => void;
  onOpenDeal: (id: string) => void;
}

function Head({ updatedAt, onRefresh, busy }: { updatedAt?: Date | null; onRefresh?: () => void; busy?: boolean }) {
  return (
    <div className="pl-ai-head">
      <div className="pl-ai-head-title">
        <PlIcon icon={Sparkles} /> AI Pipeline Insights
      </div>
      {onRefresh && (
        <div className="pl-ai-head-right">
          {updatedAt && (
            <span className="pl-ai-updated">
              Diperbarui {updatedAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(".", ":")}
            </span>
          )}
          <button type="button" className="pl-ai-refresh-btn" onClick={onRefresh} disabled={busy} aria-label="Refresh insight" title="Refresh insight">
            <PlIcon icon={RefreshCw} />
          </button>
        </div>
      )}
    </div>
  );
}

export function PipelineAIPanel({ hidden, insights, isLoading, error, updatedAt, hasDeals, deals, onRefresh, onOpenDeal }: Props) {
  let body: React.ReactNode;

  if (!hasDeals) {
    body = (
      <>
        <Head />
        <div className="pl-ai-empty">Belum ada deal untuk dianalisis. Tambahkan deal pertama — AI akan menyiapkan insight di sini.</div>
      </>
    );
  } else if (isLoading) {
    body = (
      <>
        <Head />
        <div className="pl-ai-cards">
          {[1, 2, 3].map((n) => (
            <div key={n} className="pl-ai-skel" />
          ))}
        </div>
      </>
    );
  } else if (error) {
    body = (
      <div className="pl-ai-error">
        <PlIcon icon={TriangleAlert} />
        <span>Gagal memuat insight AI: {error}</span>
        <button type="button" className="pl-ai-retry-btn" onClick={onRefresh}>
          Coba Lagi
        </button>
      </div>
    );
  } else if (insights) {
    const items = (Array.isArray(insights.insights) ? (insights.insights as RawInsight[]) : []).map(normalize);
    body = (
      <>
        <Head updatedAt={updatedAt} onRefresh={onRefresh} busy={isLoading} />
        {insights.summary && <div className="pl-ai-summary">{insights.summary}</div>}
        <div className="pl-ai-forecast">
          <div className="pl-ai-forecast-pill likely">
            <span className="lbl">Berpotensi Closing</span>
            <span className="val">{formatRupiah(Number(insights.forecast?.likely_close_value) || 0)}</span>
          </div>
          <div className="pl-ai-forecast-pill risk">
            <span className="lbl">Berisiko Hilang</span>
            <span className="val">{formatRupiah(Number(insights.forecast?.at_risk_value) || 0)}</span>
          </div>
        </div>
        <div className="pl-ai-cards">
          {items.length ? (
            items.map((it, i) => {
              const meta = PRIORITY_META[it.priority];
              const deal = it.dealId ? deals.find((d) => d.id === it.dealId) : undefined;
              const company = deal ? deal.company : it.dealId ? `Deal ${it.dealId}` : "";
              return (
                <div key={`${it.dealId}-${i}`} className="pl-ai-card" style={{ "--ai-color": meta.color, "--ai-bg": meta.bg } as React.CSSProperties}>
                  <div className="pl-ai-card-top">
                    <span className="pl-ai-badge">{meta.label}</span>
                    {company && (
                      <span className="pl-ai-company" title={company}>
                        {company}
                      </span>
                    )}
                  </div>
                  {it.title && <div className="pl-ai-card-title">{it.title}</div>}
                  {it.reasoning && <div className="pl-ai-card-reason">{it.reasoning}</div>}
                  {it.action && (
                    <div className="pl-ai-card-action">
                      <PlIcon icon={ArrowRight} />
                      <span>{it.action}</span>
                    </div>
                  )}
                  {deal && (
                    <button type="button" className="pl-ai-card-btn" onClick={() => onOpenDeal(deal.id)}>
                      {it.actionLabel}
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <div className="pl-ai-empty">Tidak ada insight mendesak saat ini — pipeline terlihat aman.</div>
          )}
        </div>
      </>
    );
  } else {
    body = <Head onRefresh={onRefresh} busy={isLoading} />;
  }

  return (
    <div className={`pl-ai-panel${hidden ? " pl-ai-panel-hidden" : ""}`} aria-hidden={hidden}>
      {body}
    </div>
  );
}
