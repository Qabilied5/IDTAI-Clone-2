"use client";

import { useMemo, useState } from "react";

import { CategoryFilterTabs } from "@/components/integrasi/CategoryFilterTabs";
import { DisconnectConfirmModal } from "@/components/integrasi/DisconnectConfirmModal";
import { IntegrationCard } from "@/components/integrasi/IntegrationCard";
import { IntegrationDetailModal } from "@/components/integrasi/IntegrationDetailModal";
import { IntegrationStatsBanner } from "@/components/integrasi/IntegrationStatsBanner";
import { useIntegrations } from "@/hooks/useIntegrations";
import { CATEGORY_LABELS } from "@/lib/integrations";
import type { Integration } from "@/types/integration";

type CategoryKey = keyof typeof CATEGORY_LABELS;

export default function IntegrasiPage() {
  const { integrations, isLoading, connect, disconnect } = useIntegrations();
  const [actionError, setActionError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [category, setCategory] = useState<CategoryKey>("semua");
  const [search, setSearch] = useState("");
  const [openIntegration, setOpenIntegration] = useState<Integration | null>(null);
  const [disconnectTarget, setDisconnectTarget] = useState<Integration | null>(null);

  const filtered = useMemo(() => {
    return integrations.filter((item) => {
      const matchCategory = category === "semua" || item.category === category;
      const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [integrations, category, search]);

  const active = filtered.filter((i) => i.status === "connected");
  const rest = filtered.filter((i) => i.status !== "connected");

  const counts = {
    connected: integrations.filter((i) => i.status === "connected").length,
    pending: integrations.filter((i) => i.status === "pending").length,
    disconnected: integrations.filter((i) => i.status === "disconnected").length,
  };

  async function handleConnect(id: string, values: Record<string, string>) {
    setIsBusy(true);
    setActionError(null);
    const err = await connect(id, values);
    setIsBusy(false);
    if (err) {
      setActionError(err);
      return;
    }
    setOpenIntegration(null);
  }

  async function handleConfirmDisconnect(id: string) {
    setIsBusy(true);
    setActionError(null);
    const err = await disconnect(id);
    setIsBusy(false);
    if (err) setActionError(err);
    setDisconnectTarget(null);
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <IntegrationStatsBanner {...counts} />

      {actionError && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-danger">
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError(null)} className="font-semibold hover:underline">
            Tutup
          </button>
        </div>
      )}

      <CategoryFilterTabs
        active={category}
        onChange={setCategory}
        search={search}
        onSearchChange={setSearch}
      />

      {isLoading ? (
        <div className="py-10 text-center text-xs text-neutral-400">Memuat integrasi…</div>
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center text-xs text-neutral-400">
          Tidak ada integrasi ditemukan. Coba kata kunci lain atau ubah filter kategori.
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <section>
              <div className="mb-2.5 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-ink">Integrasi Aktif</h3>
                <span className="text-xs text-neutral-400">{active.length} terhubung</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {active.map((item) => (
                  <IntegrationCard key={item.id} integration={item} onOpen={setOpenIntegration} />
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="mb-2.5 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">Semua Integrasi</h3>
              <span className="text-xs text-neutral-400">{rest.length} tersedia</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {rest.map((item) => (
                <IntegrationCard key={item.id} integration={item} onOpen={setOpenIntegration} />
              ))}
            </div>
          </section>
        </>
      )}

      {openIntegration && (
        <IntegrationDetailModal
          integration={openIntegration}
          onClose={() => setOpenIntegration(null)}
          onConnect={handleConnect}
          isBusy={isBusy}
          errorMessage={actionError}
          onDisconnect={() => {
            setDisconnectTarget(openIntegration);
            setOpenIntegration(null);
          }}
        />
      )}

      {disconnectTarget && (
        <DisconnectConfirmModal
          name={disconnectTarget.name}
          onCancel={() => setDisconnectTarget(null)}
          onConfirm={() => handleConfirmDisconnect(disconnectTarget.id)}
        />
      )}
    </div>
  );
}
