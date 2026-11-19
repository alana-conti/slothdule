"use client";

import Link from "next/link";

import { LeafGlyph, PlantBadge } from "@/features/habits/plant-icon";
import { HabitCheckButton, useHabitCheckin } from "@/features/habits/use-habit-checkin";
import { formatWeekdays, formatWhen, stageLabels } from "@/lib/habits";
import type { Habit } from "@/types/habits";

type HabitDayRowProps = {
    day: string;
    habit: Habit;
};

/** Um hábito da agenda de hoje: marcar cuidado, dar folga ou desfazer. */
export function HabitDayRow({ day, habit }: HabitDayRowProps) {
    const { checkLabel, chip, isAvoid, isDone, isRest, pending, toggleDone, toggleRest } =
        useHabitCheckin(habit, day);

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

            <HabitCheckButton
                checkLabel={checkLabel}
                isDone={isDone}
                isRest={isRest}
                onClick={toggleDone}
                pending={pending}
            />

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
