import Image from "next/image";
import { redirect } from "next/navigation";

import { getApiConfig } from "@/lib/api/config";
import { getCurrentUser } from "@/lib/api/server";

import AuthForm from "./auth-form";

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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-6 sm:px-8 sm:py-10">
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 h-64 w-64 -translate-x-1/3 -translate-y-1/3 rounded-full bg-sloth-moss/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute right-0 bottom-0 h-72 w-72 translate-x-1/3 translate-y-1/3 rounded-full bg-sloth-gold/10 blur-3xl"
      />

      <section className="relative grid w-full max-w-4xl overflow-hidden rounded-card border border-sloth-border bg-sloth-card shadow-soft md:grid-cols-[0.9fr_1.1fr]">
        <div className="flex items-center justify-center bg-sloth-beige/55 p-6 sm:p-8">
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

        <div className="p-6 sm:p-8 lg:p-10">
          <AuthForm error={error} message={message} />

          <div className="mt-5 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-sloth-border" />
            <span className="text-xs font-medium tracking-[0.15em] text-sloth-muted uppercase">
              ou
            </span>
            <span className="h-px flex-1 bg-sloth-border" />
          </div>

          <a
            className="mt-5 flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl border border-sloth-border bg-sloth-card px-5 font-medium text-sloth-forest transition hover:bg-sloth-beige cursor-pointer"
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
