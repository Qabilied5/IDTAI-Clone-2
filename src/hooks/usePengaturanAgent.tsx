"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { apiFetch } from "@/lib/api";
import {
  DEFAULT_ESCALATION,
  DEFAULT_FORM,
  makeBrand,
  type EscalationForm,
  type PaForm,
  type PicAgent,
} from "@/types/pengaturan-agent";

type ToastType = "" | "success" | "error";
interface ToastState {
  id: number;
  msg: string;
  type: ToastType;
}

interface AgentInput {
  nama: string;
  email: string;
  role: string;
}

interface Ctx {
  form: PaForm;
  /** Ubah sebagian nilai form (objek) atau seluruhnya (fungsi). */
  setForm: (u: Partial<PaForm> | ((f: PaForm) => PaForm)) => void;
  setEscalation: (patch: Partial<EscalationForm>) => void;
  /** Nama perusahaan dari server (untuk teks preview). */
  companyName: string;
  loading: boolean;
  dirty: boolean;
  saving: boolean;
  justSaved: boolean;
  save: () => Promise<void>;
  discard: () => void;

  agents: PicAgent[];
  agentsLoading: boolean;
  createAgent: (input: AgentInput) => Promise<boolean>;
  updateAgent: (id: number, patch: Partial<AgentInput>) => Promise<boolean>;
  toggleAgentStatus: (id: number) => Promise<void>;
  removeAgent: (id: number) => Promise<void>;

  toast: (msg: string, type?: ToastType) => void;
  toastState: ToastState | null;
}

const PaContext = createContext<Ctx | null>(null);

export function usePengaturanAgent(): Ctx {
  const ctx = useContext(PaContext);
  if (!ctx) throw new Error("usePengaturanAgent harus dipakai di dalam <PengaturanAgentProvider>");
  return ctx;
}

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

interface IdentityRes { identity?: { botName?: string; companyName?: string } }
interface EscalationRes {
  settings?: Partial<Omit<EscalationForm, "triggers">> & { triggers?: Partial<EscalationForm["triggers"]> };
}
interface AgentsRes { agents?: PicAgent[] }

export function PengaturanAgentProvider({ children }: { children: ReactNode }) {
  const [form, setFormState] = useState<PaForm>(DEFAULT_FORM);
  const [saved, setSaved] = useState<PaForm>(DEFAULT_FORM);
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [agents, setAgents] = useState<PicAgent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [toastState, setToastState] = useState<ToastState | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((msg: string, type: ToastType = "") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastState({ id: Date.now(), msg, type });
    toastTimer.current = setTimeout(() => setToastState(null), 2500);
  }, []);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const setForm = useCallback((u: Partial<PaForm> | ((f: PaForm) => PaForm)) => {
    setFormState((f) => (typeof u === "function" ? u(f) : { ...f, ...u }));
  }, []);

  const setEscalation = useCallback((patch: Partial<EscalationForm>) => {
    setFormState((f) => ({ ...f, escalation: { ...f.escalation, ...patch } }));
  }, []);

  /* ── muat data awal dari server (milik perusahaan yang sedang login) ── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [idRes, escRes, agRes] = await Promise.allSettled([
        apiFetch<IdentityRes>("/agent/identity"),
        apiFetch<EscalationRes>("/escalation-settings"),
        apiFetch<AgentsRes>("/agents"),
      ]);
      if (cancelled) return;

      let next: PaForm = { ...DEFAULT_FORM };
      let company = "";

      if (idRes.status === "fulfilled") {
        const identity = idRes.value.identity;
        if (identity?.botName) next.agentName = identity.botName;
        company = identity?.companyName ?? "";
      }

      if (escRes.status === "fulfilled") {
        const s = escRes.value.settings ?? {};
        // Gabung dengan default lokal (jangan ditimpa total) supaya field yang belum pernah
        // tersimpan di server tetap punya nilai masuk akal.
        next.escalation = {
          ...DEFAULT_ESCALATION,
          ...s,
          keywords: Array.isArray(s.keywords) ? s.keywords : DEFAULT_ESCALATION.keywords,
          triggers: { ...DEFAULT_ESCALATION.triggers, ...(s.triggers ?? {}) },
        };
      }

      const loadedAgents = agRes.status === "fulfilled" ? agRes.value.agents ?? [] : [];
      if (agRes.status === "rejected") {
        console.error("Gagal memuat daftar PIC/Agent:", agRes.reason);
        toast("Tidak bisa memuat daftar agent dari server", "error");
      }

      // Brand awal = perusahaan yang sedang login (bukan contoh statis), supaya "nama brand aktif"
      // yang dikirim saat simpan tidak menimpa nama perusahaan dengan nama lain.
      next.brands = [
        makeBrand({ name: company || "Brand Utama", active: true, agents: loadedAgents.length }, 1),
      ];

      setCompanyName(company);
      setAgents(loadedAgents);
      setAgentsLoading(false);
      setFormState(next);
      setSaved(next);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [toast]);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);

  const save = useCallback(async () => {
    const botName = form.agentName.trim();
    if (!botName) {
      toast("Nama agent wajib diisi", "error");
      return;
    }
    const active = form.brands.find((b) => b.active);
    const e = form.escalation;

    setSaving(true);
    try {
      await Promise.all([
        apiFetch("/agent/identity", {
          method: "POST",
          body: JSON.stringify({ botName, companyName: active?.name ?? "" }),
        }),
        apiFetch("/escalation-settings", {
          method: "POST",
          body: JSON.stringify({
            keywords: e.keywords,
            triggers: e.triggers,
            priceLimitPercent: e.priceLimitPercent,
            notifyCustomer: e.notifyCustomer,
            handoffMessage: e.handoffMessage,
          }),
        }),
      ]);
      if (active?.name) setCompanyName(active.name);
      setSaved(form);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
      toast("Pengaturan berhasil disimpan", "success");
    } catch (err) {
      toast("Gagal menyimpan: " + errText(err), "error");
    } finally {
      setSaving(false);
    }
  }, [form, toast]);

  const discard = useCallback(() => {
    setFormState(saved);
    toast("Perubahan dibatalkan");
  }, [saved, toast]);

  /* ── agent (PIC): langsung tersimpan lewat API, tidak ikut tombol Simpan ── */
  const refreshAgents = useCallback(async () => {
    try {
      const d = await apiFetch<AgentsRes>("/agents");
      setAgents(d.agents ?? []);
    } catch (err) {
      toast("Gagal memuat daftar agent: " + errText(err), "error");
    }
  }, [toast]);

  const createAgent = useCallback(
    async (input: AgentInput) => {
      try {
        await apiFetch("/agents", { method: "POST", body: JSON.stringify(input) });
        toast("Agent baru berhasil ditambahkan", "success");
        await refreshAgents();
        return true;
      } catch (err) {
        toast("Gagal menyimpan: " + errText(err), "error");
        return false;
      }
    },
    [refreshAgents, toast]
  );

  const updateAgent = useCallback(
    async (id: number, patch: Partial<AgentInput>) => {
      try {
        await apiFetch(`/agents/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
        toast("Data agent diperbarui", "success");
        await refreshAgents();
        return true;
      } catch (err) {
        toast("Gagal menyimpan: " + errText(err), "error");
        return false;
      }
    },
    [refreshAgents, toast]
  );

  // Status online/offline menentukan apakah agent masuk antrean eskalasi (hanya yang 'online').
  const toggleAgentStatus = useCallback(
    async (id: number) => {
      const agent = agents.find((a) => a.id === id);
      if (!agent) return;
      const next = agent.status === "online" ? "offline" : "online";
      try {
        await apiFetch(`/agents/${id}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
        setAgents((list) => list.map((a) => (a.id === id ? { ...a, status: next } : a)));
        toast(`${agent.nama} sekarang ${next === "online" ? "Online" : "Offline"}`, "success");
      } catch (err) {
        toast("Gagal mengubah status: " + errText(err), "error");
      }
    },
    [agents, toast]
  );

  const removeAgent = useCallback(
    async (id: number) => {
      if (!window.confirm("Hapus agent ini dari daftar?")) return;
      try {
        await apiFetch(`/agents/${id}`, { method: "DELETE" });
        toast("Agent dihapus");
        await refreshAgents();
      } catch (err) {
        toast("Gagal menghapus: " + errText(err), "error");
      }
    },
    [refreshAgents, toast]
  );

  const value: Ctx = {
    form, setForm, setEscalation, companyName, loading, dirty, saving, justSaved, save, discard,
    agents, agentsLoading, createAgent, updateAgent, toggleAgentStatus, removeAgent,
    toast, toastState,
  };

  return <PaContext.Provider value={value}>{children}</PaContext.Provider>;
}
