"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";

export function LoginForm() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearError();

    try {
      await login({ email, password, rememberMe });
      router.push("/overview");
    } catch {
      // Pesan error sudah ditangani & disimpan oleh useAuthStore.
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-md">
        {/* Garis merah tipis di atas kartu */}
        <div className="h-1.5 w-full bg-accent" />

        <div className="px-8 py-8 sm:px-10 sm:py-10">
          {/* Logo & nama produk */}
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-base font-bold text-white">
              IT
            </div>
            <div>
              <p className="text-lg font-semibold leading-tight text-ink">
                Indotrading AI
              </p>
              <p className="text-sm text-muted">Admin Dashboard</p>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-ink">Masuk ke akun Anda</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Kelola percakapan WhatsApp &amp; Telegram, leads, dan AI Agent
            dari satu dashboard.
          </p>

          <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-5">
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
              >
                {error}
              </div>
            )}

            <Field label="Email" htmlFor="email">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@indotrading.com"
                className={inputClass}
              />
            </Field>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="password" className="flex items-center gap-1 text-sm font-semibold text-ink">
                  Password
                  <span className="text-accent">*</span>
                </label>
                <a
                  href="/forgot-password"
                  className="text-sm font-medium text-accent hover:text-accent-strong"
                >
                  Lupa password?
                </a>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={cn(inputClass, "pr-11")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                  aria-label={
                    showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-4.5 w-4.5" />
                  ) : (
                    <Eye className="h-4.5 w-4.5" />
                  )}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2.5 pt-1 text-sm text-muted">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4.5 w-4.5 rounded border-neutral-300 accent-accent"
              />
              Ingat saya di perangkat ini
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? "Memproses..." : "Masuk"}
            </button>
          </form>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-muted">
        © {new Date().getFullYear()} Indotrading AI. Hanya untuk penggunaan
        internal tim.
      </p>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-ink placeholder:text-neutral-400 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent";

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 flex items-center gap-1 text-sm font-semibold text-ink">
        {label}
        <span className="text-accent">*</span>
      </label>
      {children}
    </div>
  );
}