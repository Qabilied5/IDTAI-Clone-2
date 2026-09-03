const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

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
 * Wrapper fetch tunggal ke backend Express (server.js) yang sudah ada.
 * Semua pemanggilan API sebaiknya lewat sini, bukan fetch() langsung
 * di komponen.
 */
export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { token, headers, ...rest } = options;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    credentials: "include",
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
