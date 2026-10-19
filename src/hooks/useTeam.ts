"use client";

import { useCallback, useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";

export interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  isSelf: boolean;
}

export interface NewUserInput {
  name: string;
  email: string;
  role: "admin" | "agent" | "viewer";
  password?: string;
}

/** Password sementara yang baru dibuat — ditampilkan sekali, tidak disimpan di server dalam bentuk asli. */
export interface Reveal {
  email: string;
  password: string;
}

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function useTeam() {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reveal, setReveal] = useState<Reveal | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await apiFetch<{ users: TeamUser[] }>("/users");
      setUsers(d.users ?? []);
      setError(null);
    } catch (e) {
      setError(msg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  /** Return pesan error (string) bila gagal, atau null bila berhasil. */
  const addUser = useCallback(async (input: NewUserInput): Promise<string | null> => {
    try {
      const d = await apiFetch<{ user: TeamUser; tempPassword: string | null }>("/users", {
        method: "POST",
        body: JSON.stringify(input),
      });
      setUsers((list) => [...list, d.user]);
      if (d.tempPassword) setReveal({ email: d.user.email, password: d.tempPassword });
      return null;
    } catch (e) {
      return msg(e);
    }
  }, []);

  const patchUser = useCallback(
    async (id: string, patch: { isActive?: boolean; role?: string; resetPassword?: boolean }): Promise<string | null> => {
      try {
        const d = await apiFetch<{ user: TeamUser; tempPassword: string | null }>(`/users/${id}`, {
          method: "PATCH",
          body: JSON.stringify(patch),
        });
        setUsers((list) => list.map((u) => (u.id === id ? d.user : u)));
        if (d.tempPassword) setReveal({ email: d.user.email, password: d.tempPassword });
        return null;
      } catch (e) {
        return msg(e);
      }
    },
    []
  );

  return { users, loading, error, reveal, dismissReveal: () => setReveal(null), addUser, patchUser, reload: load };
}
