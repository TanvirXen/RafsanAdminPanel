"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/client/api"

interface AuthUser {
  email: string
  name?: string
  role: string
  id: string
  createdAt?: string
  updatedAt?: string
}

export function useAuth() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function fetchProfile() {
      try {
        setIsLoading(true)
        setError(null)
        const data = await apiFetch<{ user: AuthUser }>("/api/auth/me")
        if (!active) return
        setUser(data.user)
      } catch (err) {
        if (!active) return
        setUser(null)
        setError((err as Error).message)
        router.push("/login")
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void fetchProfile()

    return () => {
      active = false
    }
  }, [router])

  const logout = () => {
    fetch("/api/auth/logout", { method: "POST", credentials: "include" })
      .catch(() => {})
      .finally(() => {
        setUser(null)
        router.push("/login")
      })
  }

  return { user, isLoading, error, logout }
}
