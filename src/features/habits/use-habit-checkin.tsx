"use client";

import { useOptimistic, useTransition } from "react";

import { useToast } from "@/components/sloth/toast";
import { setHabitCheckinAction } from "@/features/habits/actions";
import { stageLabels } from "@/lib/habits";
import { playCompletionSound } from "@/lib/audio/sounds";
import type { Habit, HabitCheckinStatus } from "@/types/habits";

/**
 * Cuidado, folga e desfazer de um hábito no dia, com estado otimista e o
 * toast de Folhinhas. Usado na Visão geral e na Rotina de hoje (tela Hoje).
 */
export function useHabitCheckin(habit: Habit, day: string) {
    const { toast } = useToast();
    const [pending, startTransition] = useTransition();
    const [status, setOptimisticStatus] = useOptimistic<
        HabitCheckinStatus | null,
        HabitCheckinStatus | null
    >(habit.todayStatus, (_, next) => next);

    const isDone = status === "done";
    const isRest = status === "rest";
    const isAvoid = habit.kind === "avoid";

    function apply(next: HabitCheckinStatus | null, previous: HabitCheckinStatus | null) {
        startTransition(async () => {
            setOptimisticStatus(next);
            const result = await setHabitCheckinAction(habit.id, day, next);

            if (!result.ok) {
                toast({ description: result.error, title: "Não deu para registrar", tone: "error" });
                return;
            }

            if (next !== "done") {
                return;
            }

            const grew = result.habit.stage !== habit.stage;
            const undo = {
                label: "Desfazer",
                onClick: () => apply(previous, "done"),
            };

            let title = isAvoid ? "Hoje você conseguiu" : "Cuidado registrado";
            let description = `+${result.leavesAwarded} ${result.leavesAwarded === 1 ? "Folhinha" : "Folhinhas"} por “${habit.title}”.`;

            if (grew) {
                title = "A planta cresceu";
                description = `“${habit.title}” virou ${stageLabels[result.habit.stage].toLowerCase()}. Agora rende +${result.habit.leavesPerCheckin} por cuidado.`;
            } else if (result.leavesAwarded === 0) {
                title = "Cuidado registrado";
                description = `Teto de ${result.leavesCap} Folhinhas de hábitos alcançado hoje. A planta cresceu mesmo assim.`;
            }

            if (result.routineBonusChange > 0) {
                title = "Rotinas de hoje completas";
                description = `${description} E +${result.routineBonusChange} de bônus pelas rotinas, além do teto.`;
            }

            toast({ action: undo, description, title });
        });
    }

    function toggleDone() {
        if (pending || isRest) {
            return;
        }

        if (!isDone) {
            playCompletionSound();
        }

        apply(isDone ? null : "done", status);
    }

    function toggleRest() {
        if (pending || isDone) {
            return;
        }

        apply(isRest ? null : "rest", status);
    }

    const checkLabel = isDone
        ? `Desmarcar “${habit.title}”`
        : isAvoid
          ? `Hoje consegui evitar: ${habit.title}`
          : `Marcar como feito: ${habit.title}`;

    // Enquanto salva, o prop ainda é o de antes: mostra o valor do estágio.
    const confirmedDone = isDone && habit.todayStatus === "done" && !pending;
    let chip = `+${habit.leavesPerCheckin}`;

    if (confirmedDone) {
        chip = habit.todayLeaves > 0 ? `+${habit.todayLeaves} ganhas` : "cresceu";
    } else if (isRest) {
        chip = "folga";
    }

    return { checkLabel, chip, isAvoid, isDone, isRest, pending, toggleDone, toggleRest };
}

type CheckButtonProps = {
    checkLabel: string;
    isDone: boolean;
    isRest: boolean;
    onClick: () => void;
    pending: boolean;
    size?: "md" | "lg";
};

/** A bolinha de cuidado: vazia, com check (feito) ou com lua (folga). */
export function HabitCheckButton({
    checkLabel,
    isDone,
    isRest,
    onClick,
    pending,
    size = "lg",
}: CheckButtonProps) {
    return (
        <button
            aria-label={checkLabel}
            aria-pressed={isDone}
            className={`flex ${size === "lg" ? "size-11" : "size-10"} shrink-0 cursor-pointer items-center justify-center rounded-full border-[1.5px] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest disabled:cursor-default ${
                isDone
                    ? "border-sloth-leaf bg-sloth-leaf text-white"
                    : isRest
                      ? "border-sloth-border bg-sloth-beige text-sloth-muted"
                      : "border-sloth-moss bg-sloth-card text-sloth-moss hover:bg-sloth-moss/10"
            }`}
            disabled={isRest || pending}
            onClick={onClick}
            type="button"
        >
            {isDone ? (
                <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path d="m5 12 4.5 4.5L19 7" />
                </svg>
            ) : isRest ? (
                <svg aria-hidden="true" className="size-[18px]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24">
                    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
                </svg>
            ) : null}
        </button>
    );
}
