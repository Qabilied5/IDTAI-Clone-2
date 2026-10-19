import type { ReactNode } from "react";

import { PaSidenav } from "@/components/pengaturan-agent/PaSidenav";
import { PaSaveBar, PaToast } from "@/components/pengaturan-agent/ui";
import { PengaturanAgentProvider } from "@/hooks/usePengaturanAgent";
import "@/components/pengaturan-agent/pengaturan-agent.css";

/* Layout bersama semua sub-halaman Pengaturan Agent. Karena layout tidak di-mount ulang saat
   pindah sub-halaman, state (dan tanda "belum disimpan") tetap terjaga antar-halaman. */
export default function PengaturanAgentLayout({ children }: { children: ReactNode }) {
  return (
    <PengaturanAgentProvider>
      <div className="pa-root">
        <div className="pa-shell">
          <PaSidenav />
          <div className="pa-content">
            {children}
            <PaSaveBar />
          </div>
        </div>
        <PaToast />
      </div>
    </PengaturanAgentProvider>
  );
}
