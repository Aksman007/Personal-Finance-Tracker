"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api-client";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    api
      .get<User>("/auth/me")
      .then((res) => setState({ user: res.data, loading: false, error: null }))
      .catch(() => setState({ user: null, loading: false, error: null }));
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setState({ user: null, loading: false, error: null });
      window.location.href = "/login";
    }
  }, []);

  return { ...state, logout };
}
