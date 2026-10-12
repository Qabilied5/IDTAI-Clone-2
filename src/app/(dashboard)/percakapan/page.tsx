import type { Metadata } from "next";

import { PercakapanContent } from "@/components/percakapan/PercakapanContent";

export const metadata: Metadata = {
  title: "Percakapan — Indotrading AI",
};

export default function PercakapanPage() {
  return <PercakapanContent />;
}
