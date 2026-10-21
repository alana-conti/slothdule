import Image from "next/image";
import { redirect } from "next/navigation";

import { getApiConfig } from "@/lib/api/config";
import { getCurrentUser } from "@/lib/api/server";

import { login, signUp } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/today");
  }

  const { error, message } = await searchParams;
  const { publicApiUrl } = getApiConfig();

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

          <div className="mt-6 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-sloth-border" />
            <span className="text-xs font-medium tracking-[0.15em] text-sloth-muted uppercase">
              ou
            </span>
            <span className="h-px flex-1 bg-sloth-border" />
          </div>

          <a
            className="mt-6 flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl border border-sloth-border bg-sloth-card px-5 font-medium text-sloth-forest transition hover:bg-sloth-beige cursor-pointer"
            href={`${publicApiUrl}/auth/google/login`}
          >
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M22.56 12.23c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23Z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
                fill="#EA4335"
              />
            </svg>
            Continuar com Google
          </a>
        </div>
      </section>
    </main>
  );
}
