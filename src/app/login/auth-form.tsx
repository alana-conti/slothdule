"use client";

import { useState, type FormEvent } from "react";

import { login, lookupAccount, signUp } from "./actions";

type AuthStep = "email" | "login" | "signup";

type AuthFormProps = {
  error?: string;
  message?: string;
};

const COPY: Record<AuthStep, { kicker: string; title: string; subtitle: string }> = {
  email: {
    kicker: "Bem-vindo de volta",
    title: "Entrar ou criar conta",
    subtitle: "Me diga seu e-mail e a gente já resolve o resto.",
  },
  login: {
    kicker: "Bem-vindo de volta",
    title: "Entrar no Slothdule",
    subtitle: "Que bom te ver de novo. Só falta a senha e você está dentro.",
  },
  signup: {
    kicker: "Novo por aqui",
    title: "Criar sua conta",
    subtitle:
      "Não achamos uma conta com esse e-mail. Escolha uma senha e comece com calma.",
  },
};

const FIELD_CLASS =
  "min-h-12 w-full rounded-2xl border bg-sloth-card px-4 pr-12 text-sloth-ink outline-none transition focus:ring-3 focus:ring-sloth-moss/15";
const FIELD_OK = "border-sloth-border focus:border-sloth-moss";
const FIELD_ERROR = "border-sloth-terracotta focus:border-sloth-terracotta";
const LABEL_CLASS = "mb-2 block text-sm font-medium text-sloth-ink";
const INPUT_BASE_CLASS =
  "min-h-12 w-full rounded-2xl border border-sloth-border bg-sloth-card px-4 text-sloth-ink outline-none transition focus:border-sloth-moss focus:ring-3 focus:ring-sloth-moss/15";
const BACK_LINK_CLASS =
  "cursor-pointer text-sm font-medium text-sloth-muted underline-offset-3 transition hover:text-sloth-ink hover:underline";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M3 3l18 18M10.6 5.1a9.8 9.8 0 0 1 1.4-.1c5 0 9 4.2 9 7 0 1.2-.7 2.6-1.9 3.9M6.6 6.7C4.4 8.1 3 10.4 3 12c0 2.8 4 7 9 7 1.5 0 2.9-.4 4.1-1M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  ) : (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function PasswordField({
  name,
  label,
  autoComplete,
  error,
  hint,
}: {
  name: string;
  label: string;
  autoComplete: string;
  error?: boolean;
  hint?: string;
}) {
  const [show, setShow] = useState(false);
  const inputId = `field-${name}`;

  return (
    <div>
      <label className={LABEL_CLASS} htmlFor={inputId}>
        {label}
      </label>
      <div className="relative">
        <input
          autoComplete={autoComplete}
          className={`${FIELD_CLASS} ${error ? FIELD_ERROR : FIELD_OK}`}
          id={inputId}
          name={name}
          placeholder={hint}
          type={show ? "text" : "password"}
        />
        <button
          aria-label={show ? "Ocultar senha" : "Mostrar senha"}
          className="absolute top-1/2 right-1.5 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-xl text-sloth-muted transition hover:text-sloth-ink"
          onClick={() => setShow((value) => !value)}
          type="button"
        >
          <EyeIcon open={show} />
        </button>
      </div>
    </div>
  );
}

function Banner({
  tone,
  children,
}: {
  tone: "error" | "status";
  children: string;
}) {
  return (
    <p
      className={
        tone === "error"
          ? "mt-5 rounded-2xl border border-sloth-terracotta/30 bg-sloth-terracotta/10 px-4 py-3 text-sm leading-6 text-sloth-ink"
          : "mt-5 rounded-2xl border border-sloth-leaf/30 bg-sloth-leaf/10 px-4 py-3 text-sm leading-6 text-sloth-forest"
      }
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </p>
  );
}

export default function AuthForm({ error, message }: AuthFormProps) {
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [checking, setChecking] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [mismatch, setMismatch] = useState(false);
  const copy = COPY[step];

  function handleEmailContinue() {
    if (checking) {
      return;
    }

    setChecking(true);
    setLookupError(null);
    lookupAccount(email.trim()).then((result) => {
      setChecking(false);
      if ("error" in result) {
        setLookupError(result.error);
        return;
      }
      setStep(result.exists ? "login" : "signup");
    });
  }

  function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    if (step !== "signup") {
      return;
    }

    const form = event.currentTarget;
    const password = form.elements.namedItem("password");
    const confirmPassword = form.elements.namedItem("confirm_password");

    if (
      password instanceof HTMLInputElement &&
      confirmPassword instanceof HTMLInputElement &&
      password.value !== confirmPassword.value
    ) {
      event.preventDefault();
      setMismatch(true);
      confirmPassword.focus();
    }
  }

  return (
    <div className="mt-6">
      <p className="text-xs font-semibold tracking-[0.2em] text-sloth-moss uppercase">
        {copy.kicker}
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-sloth-ink">
        {copy.title}
      </h1>
      <p className="mt-3 leading-7 text-sloth-muted">{copy.subtitle}</p>

      {error ? <Banner tone="error">{error}</Banner> : null}
      {message ? <Banner tone="status">{message}</Banner> : null}
      {lookupError ? <Banner tone="error">{lookupError}</Banner> : null}

      {step === "email" ? (
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleEmailContinue();
          }}
        >
          <div>
            <label className={LABEL_CLASS} htmlFor="email">
              E-mail
            </label>
            <input
              autoFocus
              autoComplete="email"
              className={INPUT_BASE_CLASS}
              id="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@exemplo.com"
              required
              type="email"
              value={email}
            />
          </div>
          <button
            className="min-h-12 w-full cursor-pointer rounded-2xl bg-sloth-moss px-5 font-semibold text-white transition hover:bg-sloth-forest focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-sloth-moss disabled:cursor-wait disabled:opacity-70"
            disabled={checking || email.length === 0}
            type="submit"
          >
            {checking ? "Verificando..." : "Continuar"}
          </button>
        </form>
      ) : (
        <form
          action={step === "login" ? login : signUp}
          className="mt-6 space-y-4"
          onSubmit={handlePasswordSubmit}
        >
          <div>
            <label className={LABEL_CLASS} htmlFor="email">
              E-mail
            </label>
            <input
              autoComplete="email"
              className={`${INPUT_BASE_CLASS} bg-sloth-beige/40 text-sloth-muted`}
              id="email"
              name="email"
              readOnly
              type="email"
              value={email}
            />
            <button
              className={`${BACK_LINK_CLASS} mt-2`}
              onClick={() => {
                setStep("email");
                setMismatch(false);
              }}
              type="button"
            >
              Usar outro e-mail
            </button>
          </div>

          <PasswordField
            autoComplete={step === "login" ? "current-password" : "new-password"}
            hint={step === "signup" ? "mín. 6 caracteres" : undefined}
            label="Senha"
            name="password"
          />

          {step === "signup" ? (
            <>
              <PasswordField
                autoComplete="new-password"
                error={mismatch}
                hint="repita a senha"
                label="Confirmar senha"
                name="confirm_password"
              />
              {mismatch ? (
                <p className="text-sm text-sloth-terracotta" role="alert">
                  As senhas não coincidem.
                </p>
              ) : null}
            </>
          ) : null}

          <button
            className="min-h-12 w-full cursor-pointer rounded-2xl bg-sloth-moss px-5 font-semibold text-white transition hover:bg-sloth-forest focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-sloth-moss"
            type="submit"
          >
            {step === "login" ? "Entrar com calma" : "Criar conta com calma"}
          </button>
        </form>
      )}
    </div>
  );
}
