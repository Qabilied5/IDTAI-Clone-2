import type { Integration, IntegrationCategory } from "@/types/integration";

export const CATEGORY_LABELS: Record<"semua" | IntegrationCategory, string> = {
  semua: "Semua",
  messaging: "Pesan",
  crm: "CRM",
  ecommerce: "E-Commerce",
  payment: "Pembayaran",
  tools: "Tools",
};

/**
 * Data katalog integrasi. INI MASIH DATA CONTOH — daftar asli ada di
 * script_page/integrasi.js pada project Vanilla yang belum dimigrasikan.
 * Status Telegram & WhatsApp akan ditimpa status sungguhan dari backend
 * lewat hook useIntegrations().
 */
export const INTEGRATIONS_CATALOG: Integration[] = [
  {
    id: "telegram",
    name: "Telegram Bot",
    category: "messaging",
    emoji: "\u2708\ufe0f",
    description: "Terima dan balas pesan pelanggan langsung dari Telegram lewat AI Agent.",
    features: ["Auto-reply AI", "Eskalasi ke agent manusia", "Riwayat percakapan tersimpan"],
    status: "disconnected",
    configFields: [
      { key: "token", label: "Bot Token", type: "password", placeholder: "123456:ABC-DEF..." },
      { key: "chatId", label: "Default Chat ID (opsional)", type: "text", placeholder: "Untuk notifikasi ke admin" },
    ],
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business API",
    category: "messaging",
    emoji: "\ud83d\udcac",
    description: "Hubungkan nomor WhatsApp Business resmi untuk percakapan otomatis dengan AI Agent.",
    features: ["Template pesan resmi", "Auto-reply AI", "Multi-agent handoff"],
    status: "disconnected",
    configFields: [
      { key: "token", label: "Access Token (Permanent / System User)", type: "password", placeholder: "EAAG..." },
      { key: "phoneNumberId", label: "Phone Number ID", type: "text", placeholder: "1234567890" },
      { key: "businessAccountId", label: "WhatsApp Business Account ID (opsional)", type: "text" },
      { key: "verifyToken", label: "Webhook Verify Token", type: "text", placeholder: "Samakan dengan yang diisi di Meta App Dashboard" },
    ],
  },
  {
    id: "instagram",
    name: "Instagram DM",
    category: "messaging",
    emoji: "\ud83d\udcf8",
    description: "Balas DM Instagram Business secara otomatis lewat AI Agent yang sama.",
    features: ["Auto-reply DM", "Deteksi komentar produk"],
    status: "disconnected",
  },
  {
    id: "hubspot",
    name: "HubSpot CRM",
    category: "crm",
    emoji: "\ud83e\udfe0",
    description: "Sinkronkan lead dan kontak dari percakapan langsung ke HubSpot.",
    features: ["Sinkronisasi kontak otomatis", "Pipeline deal tersambung"],
    status: "disconnected",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    category: "crm",
    emoji: "\u2601\ufe0f",
    description: "Kirim data lead dan riwayat percakapan ke Salesforce secara real-time.",
    features: ["Sinkronisasi lead", "Log aktivitas otomatis"],
    status: "disconnected",
  },
  {
    id: "shopify",
    name: "Shopify",
    category: "ecommerce",
    emoji: "\ud83d\udecd\ufe0f",
    description: "AI Agent bisa cek status pesanan dan stok produk langsung dari toko Shopify.",
    features: ["Cek status pesanan", "Info stok real-time"],
    status: "disconnected",
  },
  {
    id: "tokopedia",
    name: "Tokopedia Seller",
    category: "ecommerce",
    emoji: "\ud83d\udfe2",
    description: "Balas chat pembeli Tokopedia otomatis lewat AI Agent.",
    features: ["Auto-reply chat pembeli", "Notifikasi pesanan baru"],
    status: "disconnected",
  },
  {
    id: "midtrans",
    name: "Midtrans",
    category: "payment",
    emoji: "\ud83d\udcb3",
    description: "Kirim link pembayaran otomatis di tengah percakapan pelanggan.",
    features: ["Generate link pembayaran", "Notifikasi status transaksi"],
    status: "disconnected",
  },
  {
    id: "xendit",
    name: "Xendit",
    category: "payment",
    emoji: "\ud83c\udfe6",
    description: "Terima pembayaran invoice langsung dari chat WhatsApp/Telegram.",
    features: ["Invoice otomatis", "Konfirmasi pembayaran real-time"],
    status: "disconnected",
  },
  {
    id: "google-sheets",
    name: "Google Sheets",
    category: "tools",
    emoji: "\ud83d\udcca",
    description: "Ekspor otomatis data leads dan percakapan ke spreadsheet.",
    features: ["Ekspor leads otomatis", "Update berkala"],
    status: "disconnected",
  },
  {
    id: "zapier",
    name: "Zapier",
    category: "tools",
    emoji: "\u26a1",
    description: "Hubungkan Indotrading AI ke ribuan aplikasi lain lewat Zapier.",
    features: ["Trigger otomatis", "Ribuan integrasi pihak ketiga"],
    status: "disconnected",
  },
];
