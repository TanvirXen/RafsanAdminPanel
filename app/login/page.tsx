"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, Mail, Lock } from "lucide-react";
import Link from "next/link";
import apiList from "@/apiList"; // <= created in root

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch(apiList.auth.login, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // IMPORTANT: receive/set httpOnly cookie from server
        body: JSON.stringify({ email, password }),
      });

      // handle 4xx/5xx
      if (!res.ok) {
        let msg = "Login failed. Please try again.";
        try {
          const data = await res.json();
          if (data?.message) msg = data.message;
        } catch {}
        throw new Error(msg);
      }

      // server returns { token, user } and also sets cookie
      const data = await res.json();

      // Optional: keep minimal client flags; don't store token since it's cookie-based
      localStorage.setItem("isAuthenticated", "true");
      if (data?.user) {
        localStorage.setItem("adminUser", JSON.stringify(data.user));
      }

      router.push("/admin");
    } catch (err: any) {
      setError(err?.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4'>
      <Card className='w-full max-w-md'>
        <CardHeader className='space-y-2 text-center'>
          <CardTitle className='text-2xl'>Admin Login</CardTitle>
          <CardDescription>
            Enter your credentials to access the admin panel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className='space-y-6'>
            {error && (
              <div className='flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive'>
                <AlertCircle className='h-4 w-4' />
                {error}
              </div>
            )}

            <div className='space-y-2'>
              <Label htmlFor='email'>Email Address</Label>
              <div className='relative'>
                <Mail className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  id='email'
                  type='email'
                  placeholder='admin@example.com'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className='pl-10'
                  required
                />
              </div>
            </div>

            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <Label htmlFor='password'>Password</Label>
                <Link
                  href='/reset-password'
                  className='text-xs text-blue-600 hover:underline'
                >
                  Forgot password?
                </Link>
              </div>
              <div className='relative'>
                <Lock className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  id='password'
                  type='password'
                  placeholder='••••••••'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className='pl-10'
                  required
                />
              </div>
            </div>

            <Button type='submit' className='w-full' disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>

          <div className='mt-4 text-center text-xs text-muted-foreground'>
            <p>Demo credentials: any email and password</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
