"use client";

import Link from "next/link";

import { LeafGlyph, PlantBadge } from "@/features/habits/plant-icon";
import { HabitCheckButton, useHabitCheckin } from "@/features/habits/use-habit-checkin";
import { formatProgress, stageLabels } from "@/lib/habits";
import type { Habit } from "@/types/habits";

type RoutineStepRowProps = {
    day: string;
    habit: Habit;
    /** O último passo não desenha a linha que liga ao próximo. */
    last: boolean;
};

/** Um passo da rotina encadeada: bolinha de cuidado ligada ao próximo passo. */
export function RoutineStepRow({ day, habit, last }: RoutineStepRowProps) {
    const { checkLabel, chip, isAvoid, isDone, isRest, pending, toggleDone, toggleRest } =
        useHabitCheckin(habit, day);

    return (
        <li aria-busy={pending || undefined} className="flex gap-3">
            <div className="flex w-11 shrink-0 flex-col items-center">
                <HabitCheckButton
                    checkLabel={checkLabel}
                    isDone={isDone}
                    isRest={isRest}
                    onClick={toggleDone}
                    pending={pending}
                />
                {last ? null : (
                    <span
                        aria-hidden="true"
                        className={`min-h-4 w-0.5 flex-1 ${isDone ? "bg-sloth-leaf" : "bg-sloth-border"}`}
                    />
                )}
            </div>

            <div className={`flex min-w-0 flex-1 items-start gap-3 pt-0.5 ${last ? "" : "pb-4"}`}>
                <PlantBadge stage={habit.stage} />
                <div className="min-w-0 flex-1">
                    <Link
                        className={`block truncate text-[15px] font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest ${
                            isRest || isDone ? "text-sloth-muted" : "text-sloth-ink"
                        }`}
                        href={`/routine/habits/${habit.id}`}
                    >
                        {habit.title}
                    </Link>
                    <p className="mt-0.5 truncate text-[13px] text-sloth-muted">
                        {stageLabels[habit.stage]} · {isAvoid ? "evitar · " : ""}
                        {formatProgress(habit)}
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
                            aria-label={isRest ? `Desfazer folga: ${habit.title}` : `Folga hoje: ${habit.title}`}
                            className="min-h-7 cursor-pointer rounded-lg px-2 text-xs text-sloth-muted transition hover:bg-sloth-beige hover:text-sloth-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest disabled:cursor-default disabled:opacity-60"
                            disabled={pending}
                            onClick={toggleRest}
                            type="button"
                        >
                            {isRest ? "Desfazer folga" : "Folga hoje"}
                        </button>
                    )}
                </div>
            </div>
        </li>
    );
}
