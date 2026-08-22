"use client";

import { useCounterStore } from "../stores/useCounterStore";
import { useState, useEffect } from "react";

export default function Home() {
  const { count, increment, decrement, reset } = useCounterStore();
  const [backendStatus, setBackendStatus] = useState<"loading" | "online" | "offline">("loading");

  useEffect(() => {
    // Attempt to ping NestJS backend on default port 3000
    fetch("http://localhost:3000/api")
      .then((res) => {
        if (res.ok) {
          setBackendStatus("online");
        } else {
          setBackendStatus("offline");
        }
      })
      .catch(() => {
        setBackendStatus("offline");
      });
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white font-sans antialiased relative overflow-hidden">
      {/* Background decoration elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="font-bold text-sm tracking-wider">SP</span>
            </div>
            <div>
              <span className="font-semibold text-white tracking-wide">SinarPay</span>
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-mono border border-indigo-500/20">
                Monorepo
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400">Environment: <strong className="text-slate-200">Development</strong></span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12 flex-1 w-full flex flex-col gap-10 relative z-10">
        {/* Hero Section */}
        <div className="text-center md:text-left space-y-4 max-w-3xl">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-200 via-slate-100 to-purple-200 bg-clip-text text-transparent">
            Next.js & NestJS Monorepo
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed">
            Welcome to your pre-configured, high-performance monorepo stack. Powered by **Next.js** for frontend, **NestJS** for backend, and **Zustand** for state management.
          </p>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Zustand Demo */}
          <div className="md:col-span-2 rounded-2xl border border-slate-800/80 bg-slate-900/50 backdrop-blur-md p-6 flex flex-col justify-between shadow-xl transition-all duration-300 hover:border-indigo-500/40">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-white">Zustand State Management</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">
                  State: Local & Reactive
                </span>
              </div>
              <p className="text-sm text-slate-400 mb-8">
                Testing reactivity inside Next.js components. The counter value below is read from and updated using a shared Zustand store hook.
              </p>

              {/* Counter Display and Controls */}
              <div className="flex items-center gap-8 bg-slate-950/80 rounded-xl p-6 border border-slate-800 w-fit">
                <div className="text-center min-w-[80px]">
                  <span className="text-xs text-slate-500 uppercase tracking-wider block mb-1">Count Value</span>
                  <span className="text-4xl font-black font-mono bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                    {count}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={decrement}
                    className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white font-bold transition-all flex items-center justify-center border border-slate-700"
                  >
                    -
                  </button>
                  <button
                    onClick={increment}
                    className="px-4 h-10 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold transition-all border border-indigo-500 shadow-md shadow-indigo-600/20"
                  >
                    + Increment
                  </button>
                  <button
                    onClick={reset}
                    className="px-3 h-10 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-all text-xs border border-slate-800"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 text-xs text-slate-500 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span>Store is defined in <code className="text-slate-400">src/stores/useCounterStore.ts</code></span>
            </div>
          </div>

          {/* Card 2: Monorepo Architecture */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 backdrop-blur-md p-6 flex flex-col justify-between shadow-xl transition-all duration-300 hover:border-purple-500/40">
            <div>
              <h3 className="font-bold text-lg text-white mb-4">Architecture</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <div>
                    <span className="text-sm font-semibold text-slate-200 block">Frontend (Next.js)</span>
                    <span className="text-xs text-slate-500 font-mono">apps/frontend [Port 3000]</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${backendStatus === "online" ? "bg-emerald-500" : backendStatus === "loading" ? "bg-amber-500 animate-pulse" : "bg-rose-500"}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-200">Backend (NestJS)</span>
                      {backendStatus === "online" && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider font-semibold">
                          Online
                        </span>
                      )}
                      {backendStatus === "offline" && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase tracking-wider font-semibold">
                          Offline
                        </span>
                      )}
                      {backendStatus === "loading" && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider font-semibold">
                          Checking...
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 font-mono">apps/backend [Port 3001]</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <div>
                    <span className="text-sm font-semibold text-slate-200 block">Workspace Manager</span>
                    <span className="text-xs text-slate-500 font-mono">npm Workspaces</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 text-xs text-slate-400">
              Run <code className="text-indigo-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">npm run dev</code> at the root to launch both apps concurrently.
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <span>&copy; {new Date().getFullYear()} SinarPay Monorepo Setup</span>
          <span className="flex items-center gap-1">
            Build with passion by Antigravity AI
          </span>
        </div>
      </footer>
    </div>
  );
}
