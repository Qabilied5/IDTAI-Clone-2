import { apiFetch } from "@/lib/api";
import type { AuthResponse, LoginCredentials } from "@/types/auth";

/**
 * Kirim kredensial ke endpoint login backend.
 * Endpoint ini mengarah ke server.js (Express) yang sudah menangani
 * verifikasi user & penerbitan token — lihat integrasi eskalasi/agent
 * yang sudah berjalan di backend yang sama.
 */
export async function loginRequest(
  credentials: LoginCredentials
): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: credentials.email,
      password: credentials.password,
    }),
  });
}
