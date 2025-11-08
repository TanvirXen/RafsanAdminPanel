// app/reset-password/page.tsx
"use client";

import type React from "react";
import { useEffect, useState } from "react";
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
import { AlertCircle, CheckCircle, Mail, ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import apiList from "@/apiList";
import { apiFetch } from "@/lib/api-fetch";

type ResetStep = "email" | "otp" | "password" | "success";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<ResetStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);

  // start/maintain countdown
  useEffect(() => {
    if (otpTimer <= 0) return;
    const id = setInterval(() => setOtpTimer((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [otpTimer]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const data = await apiFetch<{
        message?: string;
        expiresIn?: number;
        demoCode?: string;
      }>(apiList.auth.reset.request, {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setOtpTimer(Number(data?.expiresIn || 300));
      if (data?.demoCode) {
        // dev convenience
        // eslint-disable-next-line no-console
        console.log("[dev] OTP =", data.demoCode);
      }
      setStep("otp");
    } catch (err: any) {
      setError(err?.message || "Failed to send OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await apiFetch(apiList.auth.reset.verify, {
        method: "POST",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: otp.trim(),
        }),
      });
      setStep("password");
    } catch (err: any) {
      setError(err?.message || "Invalid or expired OTP.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!newPassword || !confirmPassword) {
      setError("Please enter both password fields");
      setIsLoading(false);
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      setIsLoading(false);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      await apiFetch(apiList.auth.reset.confirm, {
        method: "POST",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: otp.trim(),
          newPassword,
        }),
      });
      setStep("success");
    } catch (err: any) {
      setError(err?.message || "Failed to reset password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (step === "success") {
    return (
      <div className='flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4'>
        <Card className='w-full max-w-md'>
          <CardHeader className='space-y-2 text-center'>
            <div className='flex justify-center'>
              <CheckCircle className='h-12 w-12 text-green-600' />
            </div>
            <CardTitle className='text-2xl'>
              Password Reset Successful
            </CardTitle>
            <CardDescription>
              Your password has been reset successfully
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <p className='text-sm text-muted-foreground'>
              You can now login with your new password.
            </p>
            <Button onClick={() => router.push("/login")} className='w-full'>
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4'>
      <Card className='w-full max-w-md'>
        <CardHeader className='space-y-2 text-center'>
          <CardTitle className='text-2xl'>
            {step === "email" && "Reset Password"}
            {step === "otp" && "Verify OTP"}
            {step === "password" && "Set New Password"}
          </CardTitle>
          <CardDescription>
            {step === "email" && "Enter your email to receive an OTP"}
            {step === "otp" && `We've sent an OTP to ${email}`}
            {step === "password" && "Create a new password for your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Email */}
          {step === "email" && (
            <form onSubmit={handleEmailSubmit} className='space-y-6'>
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
              <Button type='submit' className='w-full' disabled={isLoading}>
                {isLoading ? "Sending OTP..." : "Send OTP"}
              </Button>
            </form>
          )}

          {/* OTP */}
          {step === "otp" && (
            <form onSubmit={handleOtpSubmit} className='space-y-6'>
              {error && (
                <div className='flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive'>
                  <AlertCircle className='h-4 w-4' />
                  {error}
                </div>
              )}
              <div className='space-y-2'>
                <Label htmlFor='otp'>Enter OTP</Label>
                <Input
                  id='otp'
                  type='text'
                  placeholder='000000'
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  maxLength={6}
                  className='text-center text-2xl tracking-widest'
                  required
                />
                <p className='text-xs text-muted-foreground'>
                  {otpTimer > 0
                    ? `OTP expires in ${Math.floor(otpTimer / 60)}:${(
                        otpTimer % 60
                      )
                        .toString()
                        .padStart(2, "0")}`
                    : "OTP expired"}
                </p>
              </div>
              <Button
                type='submit'
                className='w-full'
                disabled={isLoading || otpTimer <= 0}
              >
                {isLoading ? "Verifying..." : "Verify OTP"}
              </Button>
              <Button
                type='button'
                variant='outline'
                className='w-full bg-transparent'
                onClick={() => {
                  setStep("email");
                  setOtp("");
                  setError("");
                }}
              >
                <ArrowLeft className='mr-2 h-4 w-4' />
                Back
              </Button>
            </form>
          )}

          {/* New Password */}
          {step === "password" && (
            <form onSubmit={handlePasswordSubmit} className='space-y-6'>
              {error && (
                <div className='flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive'>
                  <AlertCircle className='h-4 w-4' />
                  {error}
                </div>
              )}
              <div className='space-y-2'>
                <Label htmlFor='newPassword'>New Password</Label>
                <div className='relative'>
                  <Lock className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                  <Input
                    id='newPassword'
                    type='password'
                    placeholder='••••••••'
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className='pl-10'
                    required
                  />
                </div>
                <p className='text-xs text-muted-foreground'>
                  Minimum 8 characters
                </p>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='confirmPassword'>Confirm Password</Label>
                <div className='relative'>
                  <Lock className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                  <Input
                    id='confirmPassword'
                    type='password'
                    placeholder='••••••••'
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className='pl-10'
                    required
                  />
                </div>
              </div>
              <Button type='submit' className='w-full' disabled={isLoading}>
                {isLoading ? "Resetting..." : "Reset Password"}
              </Button>
              <Button
                type='button'
                variant='outline'
                className='w-full bg-transparent'
                onClick={() => {
                  setStep("otp");
                  setNewPassword("");
                  setConfirmPassword("");
                  setError("");
                }}
              >
                <ArrowLeft className='mr-2 h-4 w-4' />
                Back
              </Button>
            </form>
          )}

          {/* <div className="mt-4">
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 text-sm text-blue-600 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Link>
          </div> */}
        </CardContent>
      </Card>
    </div>
  );
}
