"use client";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import apiList from "@/apiList";
import { apiFetch, getToken } from "@/lib/api-fetch";

export type SafeUser = {
  id: string;
  email: string;
  name?: string;
  role: "admin" | "editor";
};

export function useAuth(
  options: { redirectOnUnauthed?: boolean } = { redirectOnUnauthed: true }
) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SafeUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = getToken();
      if (!token) throw new Error("unauthorized");
      const data = await apiFetch<{ user: SafeUser }>(apiList.auth.me, {
        method: "GET",
      });
      setUser(data.user);
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("adminUser", JSON.stringify(data.user));
    } catch {
      setUser(null);
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("adminUser");
      if (options.redirectOnUnauthed && pathname?.startsWith("/admin")) {
        router.replace("/login");
      }
    } finally {
      setIsLoading(false);
    }
  }, [router, pathname, options.redirectOnUnauthed]);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const logout = useCallback(async () => {
    try {
      await fetch(apiList.auth.logout, { method: "POST" });
    } catch {}
    localStorage.removeItem("admin_token");
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("adminUser");
    setUser(null);
    router.replace("/login");
  }, [router]);

  return { user, isLoading, logout, refetch: fetchMe };
}
