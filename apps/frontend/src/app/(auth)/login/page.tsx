"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useSessionStore } from "@/stores/session.store";

const loginSchema = z.object({
  email: z.string().email("Masukkan email yang valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

type LoginSuccess = {
  user: {
    id: string;
    role: "MERCHANT" | "OPS";
    merchantId: string;
    merchantName: string;
  };
};

export default function LoginPage() {
  const router = useRouter();
  const setSession = useSessionStore((state) => state.setSession);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(values),
      });

      let payload: (LoginSuccess & { message?: string }) | null = null;
      try {
        payload = (await response.json()) as LoginSuccess & { message?: string };
      } catch {
        payload = null;
      }

      if (!response.ok) {
        setServerError(payload?.message ?? "Login gagal. Coba cek kredensial atau backend service.");
        return;
      }

      if (!payload?.user) {
        setServerError("Login gagal: respons server tidak valid.");
        return;
      }

      setSession({
        role: payload.user.role,
        merchantId: payload.user.merchantId,
        merchantName: payload.user.merchantName,
      });

      router.push("/dashboard");
    } catch {
      setServerError("Login gagal. Backend atau jaringan sedang tidak tersedia.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl">
        <p className="text-xs uppercase tracking-[0.3em] text-indigo-400">SinarPay</p>
        <h1 className="mt-3 text-3xl font-semibold">Login merchant</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Masuk untuk mengakses dashboard merchant dan fitur pembayaran.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-200">Email</span>
            <input
              type="email"
              autoComplete="email"
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm outline-none transition focus:border-indigo-500"
              {...register("email")}
            />
            {errors.email ? <p className="mt-2 text-xs text-rose-400">{errors.email.message}</p> : null}
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-200">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm outline-none transition focus:border-indigo-500"
              {...register("password")}
            />
            {errors.password ? (
              <p className="mt-2 text-xs text-rose-400">{errors.password.message}</p>
            ) : null}
          </label>

          {serverError ? <p className="text-sm text-rose-400">{serverError}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Memproses..." : "Masuk"}
          </button>
        </form>
      </section>
    </main>
  );
}
