// ABOUTME: Authentication page with tabbed login/signup interface
// ABOUTME: Displays login form, signup form, and OAuth options in a clean card

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { SignupForm } from "@/components/auth/signup-form";
import { OAuthButtons } from "@/components/auth/oauth-buttons";

type AuthTab = "signin" | "signup";

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<AuthTab>("signin");

  useEffect(() => {
    console.log("🔑 [LOGIN PAGE] Component mounted", {
      timestamp: new Date().toISOString(),
      pathname: window.location.pathname,
    });
  }, []);

  console.log("🔑 [LOGIN PAGE] Rendering", { activeTab });

  return (
    <div className="w-full max-w-md">
      {/* Logo / Brand */}
      <div className="mb-8 text-center">
        <Link href="/" className="inline-block">
          <h1 className="font-serif text-3xl tracking-tight text-smoke">
            Holmes
          </h1>
        </Link>
        <p className="mt-2 text-sm text-stone">
          {activeTab === "signin"
            ? "Sign in to continue your investigation"
            : "Create an account to get started"}
        </p>
      </div>

      {/* Auth Card */}
      <div className="rounded-2xl border border-smoke/10 bg-jet p-8">
        {/* Tab Switcher */}
        <div className="mb-6 flex gap-1 rounded-lg bg-charcoal p-1">
          <button
            type="button"
            onClick={() => setActiveTab("signin")}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "signin"
                ? "bg-jet text-smoke"
                : "text-stone hover:text-smoke"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("signup")}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "signup"
                ? "bg-jet text-smoke"
                : "text-stone hover:text-smoke"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form */}
        {activeTab === "signin" ? <LoginForm /> : <SignupForm />}

        {/* Divider */}
        <div className="my-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-smoke/10" />
          <span className="text-xs text-stone">Or continue with</span>
          <div className="h-px flex-1 bg-smoke/10" />
        </div>

        {/* OAuth Buttons */}
        <OAuthButtons />
      </div>

      {/* Back to landing */}
      <div className="mt-6 text-center">
        <Link
          href="/"
          className="text-sm text-stone transition-colors hover:text-smoke"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
