"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User, LogIn, UserPlus } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const supabase = createClient();

  const handleGoogleAuth = async () => {
    setLoading(true);
    setMessage(null);

    if (!supabase) {
      sessionStorage.setItem("dg_user_email", "dailygermanmalayalam3@gmail.com");
      setMessage({
        type: "success",
        text: "Demo mode: Signed in as dailygermanmalayalam3@gmail.com. Redirecting...",
      });
      setTimeout(() => router.push("/"), 1200);
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (activeTab === "signup" && password !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      setLoading(false);
      return;
    }

    if (!supabase) {
      // Local fallback simulation
      sessionStorage.setItem("dg_user_email", email);
      setMessage({
        type: "success",
        text: `Demo mode: Authenticated as ${email}. Redirecting...`,
      });
      setTimeout(() => router.push("/"), 1200);
      setLoading(false);
      return;
    }

    if (activeTab === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        setMessage({
          type: "success",
          text: "Registration successful! If confirmation is required, please check your inbox.",
        });
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        const adminEmails = ["dailygermanmalayalam3@gmail.com"];
        if (email && !adminEmails.includes(email.toLowerCase())) {
          await supabase.auth.signOut();
          setMessage({ type: "error", text: "Access Denied: Only authorized administrators can access this CMS." });
          setLoading(false);
          return;
        }
        router.push("/");
        router.refresh();
      }
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto my-8">
      <div className="border-2 border-black dark:border-neutral-700 bg-white dark:bg-[#141414] p-6 sm:p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(250,204,21,0.3)] transition-all">
        {/* Header Tabs */}
        <div className="grid grid-cols-2 gap-2 mb-6 border-b-2 border-black dark:border-neutral-800 pb-4">
          <button
            type="button"
            onClick={() => {
              setActiveTab("signin");
              setMessage(null);
            }}
            className={`py-2 px-3 text-xs sm:text-sm font-black uppercase tracking-wider border-2 border-black dark:border-neutral-700 flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "signin"
                ? "bg-[#ffe600] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_#ffe600]"
                : "bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("signup");
              setMessage(null);
            }}
            className={`py-2 px-3 text-xs sm:text-sm font-black uppercase tracking-wider border-2 border-black dark:border-neutral-700 flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "signup"
                ? "bg-[#ffe600] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_#ffe600]"
                : "bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Sign Up</span>
          </button>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-black dark:text-white tracking-tight uppercase">
            {activeTab === "signin" ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
            {activeTab === "signin"
              ? "Sign in to access your German learning account"
              : "Join Daily German Malayalam with Google or Email"}
          </p>
        </div>

        {message && (
          <div
            className={`p-3 text-xs font-semibold mb-4 border ${
              message.type === "success"
                ? "bg-green-50 dark:bg-green-950/50 border-green-500 text-green-900 dark:text-green-200"
                : "bg-red-50 dark:bg-red-950/50 border-red-500 text-red-900 dark:text-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* 1. GOOGLE AUTH BUTTON */}
        <button
          onClick={handleGoogleAuth}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border-2 border-black dark:border-neutral-700 bg-white dark:bg-neutral-900 text-black dark:text-white font-bold text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)] hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all cursor-pointer mb-6"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>
            {activeTab === "signin" ? "Sign In with Google" : "Sign Up with Google"}
          </span>
        </button>

        <div className="relative flex py-2 items-center mb-6">
          <div className="flex-grow border-t border-neutral-300 dark:border-neutral-700"></div>
          <span className="flex-shrink mx-3 text-neutral-500 dark:text-neutral-400 text-xs uppercase font-bold tracking-wider">
            Or with Email
          </span>
          <div className="flex-grow border-t border-neutral-300 dark:border-neutral-700"></div>
        </div>

        {/* 2. DIRECT EMAIL & PASSWORD FORM */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 border-2 border-black dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm text-black dark:text-white focus:outline-none focus:bg-[#fffbeb] dark:focus:bg-neutral-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 border-2 border-black dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm text-black dark:text-white focus:outline-none focus:bg-[#fffbeb] dark:focus:bg-neutral-800"
            />
          </div>

          {activeTab === "signup" && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 border-2 border-black dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm text-black dark:text-white focus:outline-none focus:bg-[#fffbeb] dark:focus:bg-neutral-800"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 border-2 border-black dark:border-neutral-700 bg-[#ffe600] text-black font-black text-sm uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_#ffe600] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all cursor-pointer"
          >
            {loading
              ? "Processing..."
              : activeTab === "signin"
              ? "Sign In with Email"
              : "Create Account"}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-800 text-center text-xs">
          <button
            type="button"
            onClick={() => {
              setActiveTab(activeTab === "signin" ? "signup" : "signin");
              setMessage(null);
            }}
            className="text-neutral-700 dark:text-neutral-300 font-bold hover:text-black dark:hover:text-white underline underline-offset-2 cursor-pointer"
          >
            {activeTab === "signin"
              ? "New here? Sign Up for an account"
              : "Already registered? Sign In with your email"}
          </button>
        </div>
      </div>
    </div>
  );
}