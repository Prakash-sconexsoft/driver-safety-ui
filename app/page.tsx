"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState("");

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!username.trim() || !userId.trim()) {
      return;
    }

    // For the POC, we store the logged-in driver's information
    // temporarily in the browser.
    localStorage.setItem(
      "driver",
      JSON.stringify({
        user_id: userId,
        username: username,
        camera_id: `camera_${userId}`,
      })
    );

    router.push("/dashboard");
  };

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / title */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-3xl">
            🚛
          </div>

          <h1 className="text-3xl font-bold text-white">
            Driver Safety System
          </h1>

          <p className="mt-2 text-slate-400">
            Real-time driver behaviour monitoring
          </p>
        </div>

        {/* Login card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white">
            Driver Login
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Enter your driver details to continue.
          </p>

          <form onSubmit={handleLogin} className="mt-6 space-y-5">
            {/* User ID */}
            <div>
              <label
                htmlFor="userId"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                User ID
              </label>

              <input
                id="userId"
                type="text"
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
                placeholder="e.g. user_001"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-blue-500"
              />
            </div>

            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Driver Name
              </label>

              <input
                id="username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="e.g. Driver A"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-blue-500"
              />
            </div>

            {/* Login button */}
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 active:bg-blue-700"
            >
              Login & Continue
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Driver Behaviour Detection • POC
        </p>
      </div>
    </main>
  );
}
