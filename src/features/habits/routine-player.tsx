"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";

import { useToast } from "@/components/sloth/toast";
import { setHabitCheckinAction } from "@/features/habits/actions";
import { LeafGlyph, PlantIcon, stageTone } from "@/features/habits/plant-icon";
import { playCompletionSound } from "@/lib/audio/sounds";
import { formatProgress, HABIT_DAILY_LEAF_CAP, ROUTINE_BONUS, stageLabels } from "@/lib/habits";
import type { Habit, Routine } from "@/types/habits";

type StepResult = "done" | "rest" | "later";

type RoutinePlayerProps = {
    routine: Routine;
    /** Passos de hoje, na ordem da rotina. */
    steps: Habit[];
    day: string;
    bonusEarned: boolean;
    backHref: string;
    backLabel: string;
};

function firstOpen(steps: Habit[], results: Record<string, StepResult>, from = 0) {
    const index = steps.findIndex((step, i) => i >= from && !results[step.id]);

    return index === -1 ? steps.length : index;
}

/** Modo rotina: um passo de cada vez, com feito, folga ou deixar para depois. */
export function RoutinePlayer({
    backHref,
    backLabel,
    bonusEarned: initialBonus,
    day,
    routine,
    steps,
}: RoutinePlayerProps) {
    const { toast } = useToast();
    const [pending, startTransition] = useTransition();
    const [results, setResults] = useState<Record<string, StepResult>>(() =>
        Object.fromEntries(
            steps.filter((step) => step.todayStatus).map((step) => [step.id, step.todayStatus!]),
        ),
    );
    const [leaves, setLeaves] = useState<Record<string, number>>(() =>
        Object.fromEntries(steps.map((step) => [step.id, step.todayLeaves])),
    );
    const [index, setIndex] = useState(() => firstOpen(steps, results));
    const [bonusEarned, setBonusEarned] = useState(initialBonus);

    const finished = index >= steps.length;
    const current = finished ? null : steps[index];
    const previous = index > 0 ? steps[index - 1] : null;

    function advance(next: Record<string, StepResult>) {
        setResults(next);
        const after = firstOpen(steps, next, index + 1);
        setIndex(after < steps.length ? after : firstOpen(steps, next));
    }

    function record(status: "done" | "rest") {
        if (!current || pending) {
            return;
        }

        if (status === "done") {
            playCompletionSound();
        }

        const step = current;
        startTransition(async () => {
            const result = await setHabitCheckinAction(step.id, day, status);

            if (!result.ok) {
                toast({ description: result.error, title: "Não deu para registrar", tone: "error" });
                return;
            }

            setLeaves((value) => ({ ...value, [step.id]: result.leavesAwarded }));

            if (result.routineBonusChange > 0) {
                setBonusEarned(true);
            }

            advance({ ...results, [step.id]: status });
        });
    }

    function later() {
        if (!current || pending) {
            return;
        }

        advance({ ...results, [current.id]: "later" });
    }

    function resumeLater() {
        const next = Object.fromEntries(
            Object.entries(results).filter(([, value]) => value !== "later"),
        ) as Record<string, StepResult>;
        setResults(next);
        setIndex(firstOpen(steps, next));
    }

    const doneCount = steps.filter((step) => results[step.id] === "done").length;
    const allDone = doneCount === steps.length;
    const anyLater = steps.some((step) => results[step.id] === "later");
    const anyRest = steps.some((step) => results[step.id] === "rest");
    const earned = steps.reduce(
        (sum, step) => sum + (results[step.id] === "done" ? (leaves[step.id] ?? 0) : 0),
        0,
    );

    let doneText = `Você ganhou ${earned} ${earned === 1 ? "Folhinha" : "Folhinhas"} nesta rotina.`;

    if (anyLater) {
        doneText = "O que ficou para depois continua na Rotina, sem pressa.";
    } else if (anyRest) {
        doneText = `${doneText} Com a folga, o bônus fica para outro dia, e tudo bem.`;
    } else if (allDone && !bonusEarned) {
        doneText = `${doneText} O bônus de +${ROUTINE_BONUS} vem quando todas as rotinas de hoje fecharem.`;
    }

    const barColor = (step: Habit, i: number) => {
        const result = results[step.id];

        if (result === "done") return "bg-sloth-leaf";
        if (result === "rest") return "bg-sloth-gold";
        if (!finished && i === index) return "bg-sloth-moss";
        return "bg-sloth-border";
    };

    // Altura da tela menos o respiro da página e a barra inferior do celular (pb-28).
    return (
        <div className="mx-auto flex min-h-[calc(100dvh-10rem)] w-full max-w-md flex-col sm:min-h-[calc(100dvh-12rem)] lg:min-h-[calc(100dvh-5rem)]">
            <div className="flex items-center justify-between gap-3">
                <Link
                    aria-label={`Fechar o passo a passo e ${backLabel.toLowerCase()}`}
                    className="inline-flex size-11 items-center justify-center rounded-full border border-sloth-border bg-sloth-card text-sloth-forest transition hover:bg-sloth-beige focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest"
                    href={backHref}
                >
                    <svg aria-hidden="true" className="size-[18px]" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M6 6l12 12M18 6 6 18" />
                    </svg>
                </Link>
                <div className="min-w-0 text-center">
                    <h1 className="truncate text-xs font-semibold tracking-[0.14em] text-sloth-forest uppercase">
                        {routine.name}
                    </h1>
                    <p aria-live="polite" className="mt-0.5 text-[13px] text-sloth-muted">
                        {finished ? "Concluída" : `Passo ${index + 1} de ${steps.length}`}
                    </p>
                </div>
                <span className="size-11" />
            </div>

            <div
                aria-hidden="true"
                className="mt-4 grid gap-1.5"
                style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
            >
                {steps.map((step, i) => (
                    <span className={`h-1.5 rounded-full transition ${barColor(step, i)}`} key={step.id} />
                ))}
            </div>

            {current ? (
                <>
                    <div
                        aria-busy={pending || undefined}
                        className="flex flex-1 flex-col items-center justify-center gap-3.5 px-1 py-8 text-center"
                    >
                        {previous || routine.anchor ? (
                            <p className="rounded-full bg-sloth-beige px-3 py-1 text-[13px] text-sloth-ink">
                                {previous ? `Depois de “${previous.title}”` : routine.anchor}
                            </p>
                        ) : null}
                        <span
                            aria-hidden="true"
                            className={`mt-1 inline-flex size-32 items-center justify-center rounded-[2.5rem] ${stageTone[current.stage]}`}
                        >
                            <PlantIcon className="size-18" stage={current.stage} strokeWidth={1.2} />
                        </span>
                        <h2 className="mt-1 text-[28px] leading-tight font-semibold tracking-[-0.02em] text-sloth-ink">
                            {current.title}
                        </h2>
                        <p className="text-sm text-sloth-muted">
                            {stageLabels[current.stage]} · {formatProgress(current)}
                        </p>
                        <span className="inline-flex items-center gap-1 rounded-full bg-sloth-leaf/18 px-3 py-1 text-sm font-semibold text-sloth-forest">
                            <span className="text-sloth-leaf">
                                <LeafGlyph className="size-3.5" />
                            </span>
                            +{current.leavesPerCheckin} {current.leavesPerCheckin === 1 ? "Folhinha" : "Folhinhas"}
                        </span>
                    </div>

                    <div className="flex flex-col gap-2">
                        <button
                            className="flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-sloth-moss text-[17px] font-semibold text-white transition hover:bg-sloth-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest disabled:opacity-60"
                            disabled={pending}
                            onClick={() => record("done")}
                            type="button"
                        >
                            <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
                                <path d="m5 12 4.5 4.5L19 7" />
                            </svg>
                            {current.kind === "avoid" ? "Consegui evitar" : "Feito"}
                        </button>
                        <div className="flex gap-2">
                            <button
                                className="min-h-12 flex-1 cursor-pointer rounded-2xl border border-sloth-border bg-sloth-card text-sm font-semibold text-sloth-forest transition hover:bg-sloth-beige focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest disabled:opacity-60"
                                disabled={pending}
                                onClick={() => record("rest")}
                                type="button"
                            >
                                Folga hoje
                            </button>
                            <button
                                className="min-h-12 flex-1 cursor-pointer rounded-2xl text-sm text-sloth-muted transition hover:bg-sloth-beige hover:text-sloth-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest disabled:opacity-60"
                                disabled={pending}
                                onClick={later}
                                type="button"
                            >
                                Deixar para depois
                            </button>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-1 py-6 text-center">
                        <Image
                            alt="Mascote bicho-preguiça"
                            className="h-auto w-28"
                            height={877}
                            sizes="112px"
                            src="/images/sloth-mascot.png"
                            width={900}
                        />
                        <h2 className="text-[26px] font-semibold tracking-[-0.02em] text-sloth-ink">
                            {allDone ? `${routine.name}: completa` : `${routine.name}: cuidada`}
                        </h2>
                        <p className="max-w-xs text-[15px] text-sloth-muted">{doneText}</p>
                        <ul aria-label="Resumo dos passos" className="mt-2 flex w-full flex-col gap-1.5">
                            {steps.map((step) => {
                                const result = results[step.id];

                                return (
                                    <li
                                        className="flex items-center gap-3 rounded-2xl border border-sloth-border bg-sloth-card px-4 py-2.5 text-left text-sm"
                                        key={step.id}
                                    >
                                        <span className="min-w-0 flex-1 truncate">{step.title}</span>
                                        <span
                                            className={`text-[13px] font-semibold ${
                                                result === "done" ? "text-sloth-forest" : "text-sloth-muted"
                                            }`}
                                        >
                                            {result === "done"
                                                ? (leaves[step.id] ?? 0) > 0
                                                    ? `+${leaves[step.id]}`
                                                    : "feito"
                                                : result === "rest"
                                                  ? "folga"
                                                  : "para depois"}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                        {bonusEarned ? (
                            <p className="mt-1 w-full rounded-2xl bg-sloth-gold/15 px-4 py-2.5 text-sm text-sloth-ink" role="status">
                                Rotinas de hoje completas: +{ROUTINE_BONUS} Folhinhas de bônus, além do teto de {HABIT_DAILY_LEAF_CAP}.
                            </p>
                        ) : null}
                    </div>
                    <div className="flex flex-col gap-2">
                        <Link
                            className="flex min-h-14 items-center justify-center rounded-2xl bg-sloth-moss text-[17px] font-semibold text-white transition hover:bg-sloth-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest"
                            href={backHref}
                        >
                            {backLabel}
                        </Link>
                        {anyLater ? (
                            <button
                                className="min-h-11 cursor-pointer rounded-2xl text-sm text-sloth-muted transition hover:bg-sloth-beige hover:text-sloth-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest"
                                onClick={resumeLater}
                                type="button"
                            >
                                Retomar o que ficou para depois
                            </button>
                        ) : null}
                    </div>
                </>
            )}
        </div>
    );
}
