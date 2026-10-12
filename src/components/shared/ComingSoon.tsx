import Link from "next/link";

interface ComingSoonProps {
  title: string;
  description?: string;
}

/* Placeholder halaman yang belum diport dari prototipe IDT-AI.
   Dipakai supaya routing lengkap & sidebar tidak 404 saat halaman lain dikerjakan. */
export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-canvas p-10 text-center">
      <span className="mb-3 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
        Dalam pengembangan
      </span>
      <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        {description ?? "Halaman ini sedang dimigrasi dari prototipe IDT-AI ke Next.js."}
      </p>
      <Link
        href="/overview"
        className="mt-6 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-canvas transition hover:bg-accent-strong"
      >
        Kembali ke Overview
      </Link>
    </section>
  );
}
