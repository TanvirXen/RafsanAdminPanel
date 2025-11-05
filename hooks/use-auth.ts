"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface AuthUser {
  email: string
  timestamp: number
}

export function useAuth() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in
    const isAuthenticated = localStorage.getItem("isAuthenticated")
    const storedAuth = localStorage.getItem("adminToken")

    if (isAuthenticated && storedAuth) {
      try {
        const auth = JSON.parse(storedAuth)
        setUser(auth)
      } catch {
        localStorage.removeItem("adminToken")
        localStorage.removeItem("isAuthenticated")
        router.push("/login")
      }
    } else {
      router.push("/login")
    }
    setIsLoading(false)
  }, [router])

  const logout = () => {
    localStorage.removeItem("adminToken")
    localStorage.removeItem("isAuthenticated")
    setUser(null)
    router.push("/login")
  }

  return { user, isLoading, logout }
}
