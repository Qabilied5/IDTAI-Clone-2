/**
 * Panel kiri halaman login — statis, tidak interaktif.
 * Diagram garis merepresentasikan cara kerja produk: percakapan dari
 * banyak channel (WhatsApp, Telegram, Web, Instagram) dirutekan lewat
 * satu node AI ke agent manusia. Gaya "blueprint" agar terasa teknikal,
 * bukan ilustrasi generik.
 */
export function BrandPanel() {
  return (
    <div className="relative hidden h-full flex-col justify-between overflow-hidden bg-panel px-12 py-10 lg:flex lg:w-[42%]">
      {/* Grid titik tipis sebagai tekstur latar */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(var(--color-border) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-sm border border-accent/40 font-display text-sm font-semibold text-accent">
          I
        </span>
        <span className="font-display text-sm tracking-tight text-primary">
          Indotrading AI
        </span>
      </div>

      <div className="relative z-10 max-w-sm">
        <RoutingDiagram />
        <h1 className="mt-10 font-display text-3xl leading-tight text-primary">
          Satu dashboard untuk semua percakapan pelanggan Anda.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          AI Agent menangani WhatsApp, Telegram, Instagram, dan Web secara
          bersamaan, lalu meneruskan ke tim Anda tepat saat dibutuhkan.
        </p>
      </div>

      <p className="relative z-10 text-xs text-muted">
        © {new Date().getFullYear()} Indotrading AI Admin Dashboard
      </p>
    </div>
  );
}

function RoutingDiagram() {
  const channels = [
    { label: "WhatsApp", y: 24 },
    { label: "Telegram", y: 74 },
    { label: "Instagram", y: 124 },
    { label: "Web", y: 174 },
  ];

  return (
    <svg
      viewBox="0 0 320 200"
      className="h-auto w-full text-border"
      role="img"
      aria-label="Diagram routing percakapan dari berbagai channel menuju AI, lalu ke agent manusia"
    >
      {channels.map((c) => (
        <g key={c.label}>
          <line
            x1="70"
            y1={c.y}
            x2="150"
            y2="99"
            stroke="currentColor"
            strokeWidth="1"
          />
          <circle cx="60" cy={c.y} r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <text
            x="10"
            y={c.y + 4}
            fill="var(--color-text-muted)"
            fontSize="9"
            fontFamily="var(--font-body)"
          >
            {c.label}
          </text>
        </g>
      ))}

      {/* Node AI di tengah */}
      <circle cx="160" cy="99" r="14" fill="var(--color-panel-raised)" stroke="var(--color-accent)" strokeWidth="1.5" />
      <text x="160" y="103" fill="var(--color-accent)" fontSize="9" textAnchor="middle" fontFamily="var(--font-display)">
        AI
      </text>

      {/* Garis ke agent manusia */}
      <line x1="174" y1="99" x2="260" y2="99" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
      <circle cx="270" cy="99" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text x="290" y="103" fill="var(--color-text-muted)" fontSize="9" fontFamily="var(--font-body)">
        Agent
      </text>
    </svg>
  );
}
