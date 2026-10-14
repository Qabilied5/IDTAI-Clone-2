import { cookies } from "next/headers";
import { jwtVerify } from "jose";

import type { UserRole } from "@/types/auth";

export interface Session {
  userId: string;
  organizationId: string;
  role: UserRole;
  name: string;
}

/**
 * Baca sesi dari cookie (hanya untuk route handler / server component).
 * Return null jika belum login, token tidak valid, atau token lama tanpa
 * informasi perusahaan (user harus login ulang).
 */
export async function getSession(): Promise<Session | null> {
  const token = cookies().get("idt-ai-session")?.value;
  const secret = process.env.AUTH_JWT_SECRET;
  if (!token || !secret) return null;

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    const userId = payload.sub;
    const organizationId = payload.org as string | undefined;
    if (!userId || !organizationId) return null;
    return {
      userId,
      organizationId,
      role: payload.role as UserRole,
      name: String(payload.name ?? ""),
    };
  } catch {
    return null;
  }
}

export function hasRole(session: Session, ...roles: UserRole[]): boolean {
  return roles.includes(session.role);
}
