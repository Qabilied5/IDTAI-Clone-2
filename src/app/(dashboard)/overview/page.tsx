import type { Metadata } from "next";

import { OverviewContent } from "@/components/overview/OverviewContent";

export const metadata: Metadata = {
  title: "Overview — Indotrading AI",
};

export default function OverviewPage() {
  return <OverviewContent />;
}
