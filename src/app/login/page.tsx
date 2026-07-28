import Image from "next/image";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { login, signUp } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    redirect("/today");
  }

  const { error, message } = await searchParams;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10 sm:px-8">
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 h-64 w-64 -translate-x-1/3 -translate-y-1/3 rounded-full bg-sloth-moss/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute right-0 bottom-0 h-72 w-72 translate-x-1/3 translate-y-1/3 rounded-full bg-sloth-gold/10 blur-3xl"
      />

      <section className="relative grid w-full max-w-4xl overflow-hidden rounded-card border border-sloth-border bg-sloth-card shadow-soft md:grid-cols-[0.9fr_1.1fr]">
        <div className="flex items-center justify-center bg-sloth-beige/55 p-8 sm:p-10">
          <div className="text-center">
            <Image
              alt="Mascote bicho-preguiça do Slothdule"
              className="mx-auto h-auto w-full max-w-56 drop-shadow-[0_16px_24px_rgba(47,36,29,0.12)]"
              height={877}
              priority
              src="/images/sloth-mascot.png"
              width={900}
            />
            <p className="mt-3 text-sm font-medium text-sloth-forest">
              Vamos organizar isso com calma?
            </p>
          </div>
        </div>

        <div className="p-7 sm:p-10 lg:p-12">
          <p className="text-xs font-semibold tracking-[0.2em] text-sloth-moss uppercase">
            Bem-vindo de volta
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-sloth-ink">
            Entrar no Slothdule
          </h1>
          <p className="mt-4 leading-7 text-sloth-muted">
            Seu dia pode esperar alguns segundos. Entre e a gente coloca tudo
            no lugar.
          </p>

          {error ? (
            <p
              className="mt-6 rounded-2xl border border-sloth-terracotta/30 bg-sloth-terracotta/10 px-4 py-3 text-sm leading-6 text-sloth-ink"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          {message ? (
            <p
              className="mt-6 rounded-2xl border border-sloth-leaf/30 bg-sloth-leaf/10 px-4 py-3 text-sm leading-6 text-sloth-forest"
              role="status"
            >
              {message}
            </p>
          ) : null}

          <form action={login} className="mt-7 space-y-5">
            <div>
              <label
                className="mb-2 block text-sm font-medium text-sloth-ink"
                htmlFor="email"
              >
                E-mail
              </label>
              <input
                autoComplete="email"
                className="min-h-12 w-full rounded-2xl border border-sloth-border bg-sloth-card px-4 text-sloth-ink outline-none transition focus:border-sloth-moss focus:ring-3 focus:ring-sloth-moss/15"
                id="email"
                name="email"
                placeholder="voce@exemplo.com"
                required
                type="email"
              />
            </div>

            <div>
              <label
                className="mb-2 block text-sm font-medium text-sloth-ink"
                htmlFor="password"
              >
                Senha
              </label>
              <input
                autoComplete="current-password"
                className="min-h-12 w-full rounded-2xl border border-sloth-border bg-sloth-card px-4 text-sloth-ink outline-none transition focus:border-sloth-moss focus:ring-3 focus:ring-sloth-moss/15"
                id="password"
                minLength={6}
                name="password"
                required
                type="password"
              />
            </div>

            <div className="flex flex-col gap-3">
              <button
                className="min-h-12 w-full rounded-2xl bg-sloth-moss px-5 font-semibold text-white transition hover:bg-sloth-forest focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-sloth-moss cursor-pointer"
                type="submit"
              >
                Entrar com calma
              </button>
              <button
                className="min-h-12 w-full rounded-2xl border border-sloth-border bg-sloth-card px-5 font-medium text-sloth-forest transition hover:bg-sloth-beige cursor-pointer"
                formAction={signUp}
                type="submit"
              >
                Criar nova conta
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
