"use client";

import { Sparkles } from "lucide-react";

import type { AiConversationSummary } from "@/types/conversation";

interface AiSummaryPanelProps {
  summary: AiConversationSummary;
}

export function AiSummaryPanel({ summary }: AiSummaryPanelProps) {
  return (
    <div className="flex flex-col gap-3 rounded-[10px] border border-border bg-canvas p-4">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
        <Sparkles className="h-3.5 w-3.5 text-accent" />
        Ringkasan AI
      </div>

      <div className="flex items-center gap-3 rounded-lg bg-panel p-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-soft text-base font-bold text-accent">
          {summary.leadScore}
        </div>
        <div className="min-w-0">
          <div className="text-[10.5px] text-muted">Lead Score</div>
          <div className="truncate text-xs font-semibold text-ink">🔥 {summary.leadTag}</div>
        </div>
      </div>

      <div>
        <div className="mb-1 text-[11px] font-semibold text-ink">Ringkasan Percakapan</div>
        <p className="text-xs leading-relaxed text-neutral-600">{summary.summary}</p>
      </div>

      <div>
        <div className="mb-1.5 text-[11px] font-semibold text-ink">Topik yang Dibahas</div>
        <div className="flex flex-wrap gap-1.5">
          {summary.topics.map((topic) => (
            <span
              key={topic}
              className="rounded-full bg-panel px-2.5 py-1 text-[10.5px] font-medium text-neutral-600"
            >
              {topic}
            </span>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1.5 text-[11px] font-semibold text-ink">Rekomendasi AI</div>
        <ul className="flex flex-col gap-1.5">
          {summary.recommendations.map((rec, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-neutral-600">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-accent" />
              {rec}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="mb-1.5 text-[11px] font-semibold text-ink">Analisis Sentimen</div>
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-panel">
          <div className="bg-success" style={{ width: `${summary.sentiment.positive}%` }} />
          <div className="bg-neutral-300" style={{ width: `${summary.sentiment.neutral}%` }} />
          <div className="bg-danger" style={{ width: `${summary.sentiment.negative}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between text-[10.5px] text-muted">
          <span>Positif {summary.sentiment.positive}%</span>
          <span>Netral {summary.sentiment.neutral}%</span>
          <span>Negatif {summary.sentiment.negative}%</span>
        </div>
      </div>
    </div>
  );
}
