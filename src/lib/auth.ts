import type { AuthResponse, LoginCredentials } from "@/types/auth";

/**
 * Kirim kredensial ke route handler Next.js (/api/auth/login),
 * yang memverifikasi user langsung ke SQL Server.
 */
export async function loginRequest(
  credentials: LoginCredentials
): Promise<AuthResponse> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message ?? "Gagal masuk. Coba lagi.");
  }
  return data as AuthResponse;
}
