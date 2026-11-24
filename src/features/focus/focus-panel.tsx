"use client";

import Link from "next/link";

import {
    chooseRhythm,
    clearFocusTask,
    pauseFocus,
    resumeFocus,
    skipFocusPhase,
    startFocus,
    stopFocus,
    useFocusState,
    useNow,
} from "./focus-store";
import {
    PHASE_LABELS,
    RHYTHMS,
    focusRhythms,
    formatClock,
    getCyclePosition,
    getPhaseProgress,
    getRemainingMs,
} from "./pomodoro";
import type { FocusSession } from "./pomodoro";

export function TimerIcon({ className = "size-5" }: { className?: string }) {
    return (
        <svg
            aria-hidden="true"
            className={`${className} shrink-0`}
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.7"
            viewBox="0 0 24 24"
        >
            <circle cx="12" cy="13" r="8" />
            <path d="M12 9v4l2.5 2.5M9.5 2.5h5M12 2.5V5" />
        </svg>
    );
}

const primaryButton =
    "inline-flex min-h-10 flex-1 cursor-pointer items-center justify-center rounded-xl bg-sloth-moss px-3 text-sm font-semibold text-white transition hover:bg-sloth-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest";

const secondaryButton =
    "inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl border border-sloth-border bg-sloth-card px-3 text-sm font-medium text-sloth-forest transition hover:bg-sloth-beige focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest";

export function RhythmPicker() {
    const { rhythm } = useFocusState();

    return (
        <fieldset>
            <legend className="sr-only">Ritmo do foco</legend>
            <div className="grid gap-1.5">
                {focusRhythms.map((value) => {
                    const config = RHYTHMS[value];
                    const selected = value === rhythm;

                    return (
                        <label
                            className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-sm transition has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-sloth-forest ${
                                selected
                                    ? "border-sloth-moss/50 bg-sloth-moss/10 text-sloth-forest"
                                    : "border-sloth-border bg-sloth-card text-sloth-ink hover:bg-sloth-beige"
                            }`}
                            key={value}
                        >
                            <input
                                checked={selected}
                                className="sr-only"
                                name="focus-rhythm"
                                onChange={() => chooseRhythm(value)}
                                type="radio"
                                value={value}
                            />
                            <span
                                aria-hidden="true"
                                className={`inline-flex size-4 shrink-0 items-center justify-center rounded-full border-2 ${
                                    selected ? "border-sloth-moss" : "border-sloth-border"
                                }`}
                            >
                                {selected ? (
                                    <span className="size-1.5 rounded-full bg-sloth-moss" />
                                ) : null}
                            </span>
                            <span className="min-w-0">
                                <span className="block font-semibold">{config.label}</span>
                                <span className="block text-xs text-sloth-muted">
                                    {config.focusMinutes} min · pausa de {config.shortBreakMinutes}
                                </span>
                            </span>
                        </label>
                    );
                })}
            </div>
        </fieldset>
    );
}

function IdleContent() {
    return (
        <div className="grid gap-3">
            <p className="text-sm text-sloth-muted">
                Um bloco de foco, uma pausa, e de novo. Dá para ligar a uma tarefa pelo botão{" "}
                <span className="font-semibold text-sloth-forest">Focar</span>, em “Em foco
                agora”.
            </p>
            <RhythmPicker />
            <button className={primaryButton} onClick={() => startFocus()} type="button">
                Começar foco
            </button>
        </div>
    );
}

function CycleDots({ session }: { session: FocusSession }) {
    const { done, total } = getCyclePosition(session);

    return (
        <span
            aria-label={`${done} de ${total} focos até a pausa longa`}
            className="flex items-center gap-1"
            role="img"
        >
            {Array.from({ length: total }, (_, index) => (
                <span
                    className={`size-1.5 rounded-full ${
                        index < done ? "bg-sloth-moss" : "bg-sloth-border"
                    }`}
                    key={index}
                />
            ))}
        </span>
    );
}

function ActiveContent({ session }: { session: FocusSession }) {
    const now = useNow(session.status === "running");
    const remaining = getRemainingMs(session, now);
    const progress = getPhaseProgress(session, now);
    const isBreak = session.phase !== "focus";
    const phaseLabel =
        session.status === "ready"
            ? "Próximo foco"
            : session.status === "paused"
              ? `${PHASE_LABELS[session.phase]} · pausado`
              : PHASE_LABELS[session.phase];

    return (
        <div className="grid gap-3">
            <div className="flex items-center justify-between gap-2">
                <p
                    className={`text-xs font-semibold tracking-[0.14em] uppercase ${
                        isBreak ? "text-sloth-gold" : "text-sloth-moss"
                    }`}
                >
                    {phaseLabel}
                </p>
                <CycleDots session={session} />
            </div>

            <div>
                <p
                    aria-label={`Tempo restante: ${formatClock(remaining)}`}
                    className="font-semibold tracking-[-0.03em] text-sloth-ink tabular-nums text-4xl"
                    role="timer"
                >
                    {formatClock(remaining)}
                </p>
                <div
                    aria-hidden="true"
                    className="mt-2 h-1.5 overflow-hidden rounded-full bg-sloth-beige"
                >
                    <div
                        className={`h-full rounded-full transition-[width] duration-1000 ease-linear motion-reduce:transition-none ${
                            isBreak ? "bg-sloth-gold" : "bg-sloth-moss"
                        }`}
                        style={{ width: `${progress * 100}%` }}
                    />
                </div>
            </div>

            {session.task ? (
                <div className="flex items-start gap-2 rounded-xl bg-sloth-beige/60 px-3 py-2 text-sm">
                    <Link
                        className="min-w-0 flex-1 font-medium text-sloth-ink hover:underline"
                        href={`/tasks/${session.task.id}`}
                    >
                        <span className="sr-only">Tarefa em foco: </span>
                        <span className="line-clamp-2 break-words">{session.task.title}</span>
                    </Link>
                    <button
                        aria-label="Desligar tarefa do foco"
                        className="-mr-1 inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-xs text-sloth-muted transition hover:bg-sloth-card hover:text-sloth-forest"
                        onClick={clearFocusTask}
                        title="Desligar tarefa"
                        type="button"
                    >
                        ✕
                    </button>
                </div>
            ) : (
                <p className="text-sm text-sloth-muted">
                    {isBreak ? "Respira. A tarefa espera você." : "Foco livre, sem tarefa ligada."}
                </p>
            )}

            {session.status === "ready" ? (
                <p className="text-sm text-sloth-forest">Pausa feita. Volte quando quiser.</p>
            ) : null}

            <div className="grid gap-2">
                {session.status === "running" ? (
                    <button className={primaryButton} onClick={pauseFocus} type="button">
                        Pausar
                    </button>
                ) : (
                    <button className={primaryButton} onClick={resumeFocus} type="button">
                        {session.status === "ready" ? "Voltar ao foco" : "Retomar"}
                    </button>
                )}
                <div className="flex gap-2">
                    {session.status !== "ready" ? (
                        <button
                            aria-label={isBreak ? "Pular pausa" : "Pular para a pausa"}
                            className={`${secondaryButton} flex-1`}
                            onClick={skipFocusPhase}
                            title={isBreak ? "Pular pausa" : "Pular para a pausa"}
                            type="button"
                        >
                            {isBreak ? "Pular pausa" : "Pular"}
                        </button>
                    ) : null}
                    <button
                        aria-label="Encerrar foco"
                        className={`${secondaryButton} flex-1 text-sloth-muted`}
                        onClick={stopFocus}
                        title="Encerrar foco"
                        type="button"
                    >
                        Encerrar
                    </button>
                </div>
            </div>
        </div>
    );
}

/** Conteúdo do Modo foco, igual no menu lateral e na folha do celular. */
export function FocusPanelContent() {
    const { session } = useFocusState();

    return session ? <ActiveContent session={session} /> : <IdleContent />;
}
