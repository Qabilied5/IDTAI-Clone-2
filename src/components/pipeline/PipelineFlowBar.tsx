import { Fragment } from "react";

import type { PipelineDeal, PipelineStage } from "@/types/pipeline";

import { FLOW_ICONS, FLOW_ICON_DEFAULT, colorToBg, stageColor, wonStageId } from "./pipeline-ui";

/* Alur stage di atas board + jumlah deal per stage (menghitung SEMUA deal, tidak
   terpengaruh filter — sama seperti versi asli). */
export function PipelineFlowBar({ deals, stages }: { deals: PipelineDeal[]; stages: PipelineStage[] }) {
  const wonId = wonStageId(stages);
  return (
    <div className="pl-flow">
      <div className="pl-flow-track">
        {stages.map((s, idx) => {
          const color = stageColor(s);
          const count = deals.filter((d) => d.stage === s.id).length;
          return (
            <Fragment key={s.id}>
              <div className={`pl-flow-stage${s.id === wonId ? " pl-flow-stage-won" : ""}`} data-stage={s.id}>
                <div className="pl-flow-icon" style={{ "--stage-color": color, "--stage-bg": colorToBg(color) } as React.CSSProperties}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={FLOW_ICONS[s.id] ?? FLOW_ICON_DEFAULT} />
                  </svg>
                </div>
                <div className="pl-flow-info">
                  <div className="pl-flow-label">{s.label}</div>
                  <div className="pl-flow-count">{count} deal</div>
                </div>
              </div>
              {idx < stages.length - 1 && (
                <div className="pl-flow-arrow">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M5 10h10M12 7l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
