"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { ShieldCheck, AlertCircle } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      setErrorMessage(decodeURIComponent(error));
    }
  }, [searchParams]);

  const supabase = createClient();

  const handleGoogleAuth = async () => {
    setLoading(true);
    setErrorMessage(null);

    if (!supabase) {
      setErrorMessage("Supabase client is not configured.");
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
      setErrorMessage(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 px-4">
      <div className="border-2 border-black dark:border-neutral-700 bg-white dark:bg-[#141414] p-6 sm:p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(250,204,21,0.3)] transition-all">
        {/* Official Logo */}
        <div className="flex justify-center mb-5">
          <Image
            src="/logo.webp"
            alt="Daily German Malayalam"
            width={160}
            height={124}
            className="h-24 w-auto object-contain drop-shadow-md"
            priority
          />
        </div>

        {/* Header Badge */}
        <div className="flex items-center justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#ffe600] text-black border-2 border-black font-black text-xs uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <ShieldCheck className="w-4 h-4" />
            <span>Admin Portal</span>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-black dark:text-white tracking-tight uppercase">
            CMS Login
          </h1>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2 leading-relaxed">
            Restricted to authorized administrators. Sign in with your registered Google account to manage vocabulary, grammar, and lesson content.
          </p>
        </div>

        {errorMessage && (
          <div className="flex items-start gap-2 p-3 text-xs font-semibold mb-6 border-2 border-red-500 bg-red-50 dark:bg-red-950/50 text-red-900 dark:text-red-200">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* GOOGLE SIGN IN BUTTON ONLY */}
        <button
          onClick={handleGoogleAuth}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 border-2 border-black dark:border-neutral-700 bg-white dark:bg-neutral-900 text-black dark:text-white font-black text-sm shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)] hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="animate-pulse">Connecting to Google...</span>
          ) : (
            <>
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
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
              <span>Sign in with Google</span>
            </>
          )}
        </button>

        <div className="mt-8 pt-4 border-t border-neutral-200 dark:border-neutral-800 text-center">
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            Daily German Malayalam • Content Management System
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="max-w-md mx-auto my-12 p-8 text-center text-sm font-bold">
        Loading admin login...
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}