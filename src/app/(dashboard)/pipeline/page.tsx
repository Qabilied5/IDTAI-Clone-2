import type { Metadata } from "next";

import { PipelineContent } from "@/components/pipeline/PipelineContent";

export const metadata: Metadata = {
  title: "Pipeline — Indotrading AI",
};

export default function PipelinePage() {
  return <PipelineContent />;
}
