"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";

import { useToast } from "@/components/sloth/toast";
import { setHabitCheckinAction } from "@/features/habits/actions";
import { LeafGlyph, PlantBadge } from "@/features/habits/plant-icon";
import { formatWeekdays, formatWhen, stageLabels } from "@/lib/habits";
import { playCompletionSound } from "@/lib/audio/sounds";
import type { Habit, HabitCheckinStatus } from "@/types/habits";

type HabitDayRowProps = {
    day: string;
    habit: Habit;
};

/** Um hábito da agenda de hoje: marcar cuidado, dar folga ou desfazer. */
export function HabitDayRow({ day, habit }: HabitDayRowProps) {
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

            if (grew) {
                toast({
                    action: undo,
                    description: `“${habit.title}” virou ${stageLabels[result.habit.stage].toLowerCase()}. Agora rende +${result.habit.leavesPerCheckin} por cuidado.`,
                    title: "A planta cresceu",
                });
            } else if (result.leavesAwarded > 0) {
                toast({
                    action: undo,
                    description: `+${result.leavesAwarded} ${result.leavesAwarded === 1 ? "Folhinha" : "Folhinhas"} por “${habit.title}”.`,
                    title: isAvoid ? "Hoje você conseguiu" : "Cuidado registrado",
                });
            } else {
                toast({
                    action: undo,
                    description: `Teto de ${result.leavesCap} Folhinhas de hábitos alcançado hoje. A planta cresceu mesmo assim.`,
                    title: "Cuidado registrado",
                });
            }
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
    const chip = isDone && !confirmedDone
        ? `+${habit.leavesPerCheckin}`
        : isDone
        ? habit.todayLeaves > 0
            ? `+${habit.todayLeaves} ganhas`
            : "cresceu"
        : isRest
          ? "folga"
          : `+${habit.leavesPerCheckin}`;

    return (
        <li
            aria-busy={pending || undefined}
            className={`flex items-center gap-3 rounded-2xl border p-3 transition ${
                isDone
                    ? "border-sloth-leaf/35 bg-sloth-leaf/6"
                    : "border-sloth-border bg-sloth-card"
            }`}
        >
            <span className="hidden w-16 shrink-0 text-center text-xs font-semibold text-sloth-muted sm:block">
                {formatWhen(habit)}
            </span>

            <button
                aria-label={checkLabel}
                aria-pressed={isDone}
                className={`flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-[1.5px] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest disabled:cursor-default ${
                    isDone
                        ? "border-sloth-leaf bg-sloth-leaf text-white"
                        : isRest
                          ? "border-sloth-border bg-sloth-beige text-sloth-muted"
                          : "border-sloth-moss bg-sloth-card text-sloth-moss hover:bg-sloth-moss/10"
                }`}
                disabled={isRest || pending}
                onClick={toggleDone}
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

            <PlantBadge stage={habit.stage} />

            <div className="min-w-0 flex-1">
                <Link
                    className={`block truncate text-[15px] font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest ${
                        isRest ? "text-sloth-muted" : "text-sloth-ink"
                    }`}
                    href={`/routine/habits/${habit.id}`}
                >
                    {habit.title}
                </Link>
                <p className="mt-0.5 truncate text-[13px] text-sloth-muted">
                    {stageLabels[habit.stage]} · {isAvoid ? "evitar · " : ""}
                    {formatWeekdays(habit.weekdays)}
                    <span className="sm:hidden"> · {formatWhen(habit)}</span>
                </p>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1">
                <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-sloth-forest ${
                        isDone ? "bg-sloth-leaf/18" : "bg-sloth-beige"
                    }`}
                >
                    <span className="text-sloth-leaf">
                        <LeafGlyph />
                    </span>
                    {chip}
                </span>
                {isDone ? null : (
                    <button
                        className="min-h-7 cursor-pointer rounded-lg px-2 text-xs text-sloth-muted transition hover:bg-sloth-beige hover:text-sloth-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest disabled:cursor-default disabled:opacity-60"
                        disabled={pending}
                        onClick={toggleRest}
                        type="button"
                    >
                        {isRest ? "Desfazer folga" : "Folga hoje"}
                    </button>
                )}
            </div>
        </li>
    );
}
