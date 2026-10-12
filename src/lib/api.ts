/* Base URL sekarang default ke Route Handler Next.js sendiri (/api) —
   backend Express (server.js) sudah dimigrasi ke src/app/api + src/server.
   NEXT_PUBLIC_API_BASE_URL tetap bisa di-set kalau backend dipisah lagi. */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface ApiFetchOptions extends RequestInit {
  token?: string | null;
}

/**
 * Wrapper fetch tunggal ke backend. Semua pemanggilan API sebaiknya lewat
 * sini, bukan fetch() langsung di komponen. Untuk upload multipart
 * (FormData), Content-Type sengaja TIDAK di-set supaya browser mengisi
 * boundary sendiri.
 */
export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { token, headers, ...rest } = options;
  const isFormData = typeof FormData !== "undefined" && rest.body instanceof FormData;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    credentials: "include",
    cache: "no-store",
  });

  const contentType = res.headers.get("content-type");
  const data = contentType?.includes("application/json")
    ? await res.json()
    : null;

  if (!res.ok) {
    const message =
      (data && (data.message || data.error)) ||
      "Terjadi kesalahan pada server. Coba lagi.";
    throw new ApiError(message, res.status);
  }

  return data as T;
}
