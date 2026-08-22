import Link from "next/link";

const links = [
  { href: "/login", label: "Login scaffold" },
  { href: "/dashboard", label: "Merchant dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/payment-generator", label: "Payment generator" },
  { href: "/settings/api-keys", label: "API keys" },
  { href: "/settings/webhooks", label: "Webhooks" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <section className="mx-auto flex min-h-[80vh] max-w-5xl flex-col justify-center gap-10">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.35em] text-indigo-400">SinarPay frontend</p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Phase 1 foundation is ready.
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-400">
            This shell sets up the App Router structure, TanStack Query provider, and modular
            Zustand stores for the next implementation phases.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 transition hover:border-indigo-500/40 hover:bg-slate-800/80"
            >
              <span className="text-sm font-medium text-white">{link.label}</span>
            </Link>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 text-sm text-slate-400">
          Query and store scaffolding are wired; feature pages will be implemented in the next
          phases.
        </div>
      </section>
    </main>
  );
}
