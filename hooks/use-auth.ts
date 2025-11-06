// hooks/use-auth.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import apiList from "@/apiList";

export type SafeUser = {
  id: string;
  email: string;
  name?: string;
  role: "admin" | "editor";
};

export function useAuth(options: { redirectOnUnauthed?: boolean } = { redirectOnUnauthed: true }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SafeUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      try {
        const res = await fetch(apiList.auth.me, {
          credentials: "include",
          cache: "no-store",
          signal,
        });
        if (!res.ok) throw new Error("unauthorized");
        const data = await res.json();
        if (signal?.aborted) return;

        setUser(data.user as SafeUser);
        // optional client flags for UI
        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem("adminUser", JSON.stringify(data.user));
      } catch {
        if (signal?.aborted) return;
        setUser(null);
        localStorage.removeItem("isAuthenticated");
        localStorage.removeItem("adminUser");
        if (options.redirectOnUnauthed && pathname?.startsWith("/admin")) {
          router.replace("/login");
        }
      } finally {
        if (!signal?.aborted) setIsLoading(false);
      }
    },
    [router, pathname, options.redirectOnUnauthed]
  );

  useEffect(() => {
    const ctrl = new AbortController();
    fetchMe(ctrl.signal);
    return () => ctrl.abort();
  }, [fetchMe]);

  const logout = useCallback(async () => {
    try {
      await fetch(apiList.auth.logout, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore network errors; still clear client state
    }
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("adminUser");
    setUser(null);
    router.replace("/login");
  }, [router]);

  return { user, isLoading, logout, refetch: () => fetchMe() };
}
