"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmail, getCurrentUser } from "@/lib/auth";
import ThemeToggle from "@/components/ThemeToggle";
import Image from "next/image";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      const user = await getCurrentUser();
      if (user) {
        router.push("/admin");
      }
    }
    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { user, error: signInError } = await signInWithEmail(
        email,
        password
      );

      if (signInError) {
        setError(signInError);
        return;
      }

      if (user) {
        router.push("/admin");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center px-4 py-8 relative">
      {/* Theme Toggle - top right */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image
              src="/beaver-images/logo.png"
              alt="Regents Ready"
              width={56}
              height={56}
              className="rounded-xl"
            />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-neutral-100 mb-3 tracking-tight">Admin Login</h1>
          <p className="text-gray-600 dark:text-neutral-400 text-lg">
            Sign in to access the question upload panel
          </p>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-2xl p-8 shadow-sm">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl text-sm font-bold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-bold text-gray-700 dark:text-neutral-300 mb-2"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-neutral-400 focus:border-black dark:focus:border-neutral-400 transition-all text-base bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-bold text-gray-700 dark:text-neutral-300 mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-neutral-400 focus:border-black dark:focus:border-neutral-400 transition-all text-base bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-6 py-4 text-base font-bold text-white bg-black dark:bg-neutral-200 dark:text-black hover:bg-gray-800 dark:hover:bg-neutral-300 active:scale-95 rounded-full shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {isLoading ? "SIGNING IN..." : "SIGN IN"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-neutral-700">
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full px-6 py-4 text-base font-bold text-gray-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 border border-gray-300 dark:border-neutral-600 hover:border-gray-400 dark:hover:border-neutral-400 hover:bg-gray-50 dark:hover:bg-neutral-800 active:scale-95 rounded-full transition-all"
            >
              BACK TO HOME
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
