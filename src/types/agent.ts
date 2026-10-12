export type AgentStatus = "online" | "offline" | "busy";

/** Human agent (bukan AI agent) -- dipakai widget "Agent Manusia Online". */
export interface Agent {
  id: string;
  nama: string;
  role: string;
  status: AgentStatus;
  /** Jumlah percakapan aktif yang sedang ditangani agent ini. */
  chat: number;
  initials?: string;
}
