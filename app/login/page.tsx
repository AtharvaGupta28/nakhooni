"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Invalid email or password.");
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 text-black">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md rounded-xl border bg-white p-6"
      >
        <h1 className="text-2xl font-bold">Nakhooni Admin</h1>

        <p className="mt-1 text-gray-600">
          Sign in to manage appointments
        </p>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-6 w-full rounded-lg border p-3"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-3 w-full rounded-lg border p-3"
          required
        />

        {error && (
          <p className="mt-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full rounded-lg bg-black p-3 font-medium text-white disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}