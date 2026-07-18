"use client";

import React, { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ShieldCheck, Mail, Lock, Eye, EyeOff, Loader2, Chrome, AlertCircle } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginInput = z.infer<typeof loginSchema>;

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: data.email,
        password: data.password,
        callbackUrl,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        router.refresh();
        router.push(callbackUrl);
      }
    } catch (err: any) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setError(null);
    try {
      await signIn("google", { callbackUrl });
    } catch (err) {
      setError("Failed to initiate Google sign-in.");
      setIsGoogleLoading(false);
    }
  };

  return (
    <div id="login_card" className="w-full max-w-md space-y-8 rounded-2xl border border-neutral-100 bg-white p-8 shadow-xl shadow-neutral-100/50 animate-fade-in">
      
      {/* Branding & Header */}
      <div id="login_brand_header" className="flex flex-col items-center text-center">
        <div id="brand_logo_wrapper" className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h2 id="brand_title" className="mt-6 text-2xl font-bold tracking-tight text-neutral-900">
          Insurance Tracking System
        </h2>
        <p id="brand_subtitle" className="mt-2 text-sm text-neutral-500">
          Sign in to manage policies, customers, and renewals
        </p>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div id="login_error_banner" className="flex items-start gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <div className="flex-1">
            <span className="font-semibold">Sign in failed</span>
            <p className="mt-1 text-red-700/90">{error}</p>
          </div>
        </div>
      )}

      {/* Login Form */}
      <form id="login_form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          
          {/* Email Input */}
          <div id="email_field_group">
            <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
              Email address
            </label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="name@insurance.com"
                disabled={isLoading || isGoogleLoading}
                {...register("email")}
                className={`block w-full rounded-xl border py-2.5 pl-10 pr-3 text-neutral-900 placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-colors ${
                  errors.email ? "border-red-300 focus:ring-red-500/20 focus:border-red-500" : "border-neutral-200"
                }`}
              />
            </div>
            {errors.email && (
              <p id="email_validation_error" className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password Input */}
          <div id="password_field_group">
            <label htmlFor="password" className="block text-sm font-medium text-neutral-700">
              Password
            </label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                disabled={isLoading || isGoogleLoading}
                {...register("password")}
                className={`block w-full rounded-xl border py-2.5 pl-10 pr-10 text-neutral-900 placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-colors ${
                  errors.password ? "border-red-300 focus:ring-red-500/20 focus:border-red-500" : "border-neutral-200"
                }`}
              />
              <button
                type="button"
                id="toggle_password_btn"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-neutral-600 focus:outline-hidden"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p id="password_validation_error" className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
                {errors.password.message}
              </p>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          id="submit_login_btn"
          disabled={isLoading || isGoogleLoading}
          className="flex w-full items-center justify-center rounded-xl bg-blue-600 py-2.5 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-500/10 hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-600/50 disabled:cursor-not-allowed transition-all duration-150"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign in with Email"
          )}
        </button>
      </form>

      {/* Separator */}
      <div id="login_separator" className="relative flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-neutral-100"></div>
        </div>
        <span className="relative bg-white px-4 text-xs font-medium uppercase tracking-wider text-neutral-400">
          Or continue with
        </span>
      </div>

      {/* Google OAuth Button */}
      <button
        type="button"
        id="google_oauth_btn"
        onClick={handleGoogleLogin}
        disabled={isLoading || isGoogleLoading}
        className="flex w-full items-center justify-center rounded-xl border border-neutral-200 bg-white py-2.5 px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 focus:outline-hidden focus:ring-2 focus:ring-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
      >
        {isGoogleLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Chrome className="mr-2 h-4 w-4 text-red-500" />
        )}
        Sign in with Google
      </button>

      {/* Quick Credentials Info Box */}
      <div id="demo_credentials_tip" className="rounded-xl bg-neutral-50 border border-neutral-100 p-4 text-xs text-neutral-500 space-y-1.5">
        <p className="font-semibold text-neutral-700">💡 System Seed (Run GET /api/setup first):</p>
        <div className="mt-1">
          <p className="font-medium text-neutral-600">Administrator Account</p>
          <p>Email: <span className="font-mono text-neutral-700 font-semibold select-all">admin@insurance.com</span></p>
          <p>Password: <span className="font-mono text-neutral-700 font-semibold select-all">Admin123!</span></p>
        </div>
      </div>

    </div>
  );
}

export default function LoginPage() {
  return (
    <div id="login_container" className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12 sm:px-6 lg:px-8">
      <Suspense fallback={
        <div className="flex h-32 w-full items-center justify-center rounded-2xl bg-white p-8 shadow-xs border border-neutral-100 max-w-md">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-xs text-neutral-500 font-medium">Loading session parameters...</span>
          </div>
        </div>
      }>
        <LoginFormContent />
      </Suspense>
    </div>
  );
}
