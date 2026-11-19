"use client";

import Link from "next/link";

import { LeafGlyph } from "@/features/habits/plant-icon";
import { HabitCheckButton, useHabitCheckin } from "@/features/habits/use-habit-checkin";
import { formatWhen, stageLabels } from "@/lib/habits";
import type { Habit } from "@/types/habits";

type HabitCompactRowProps = {
    day: string;
    habit: Habit;
    /** O próximo cuidado do dia ganha destaque e o rótulo "Próximo". */
    highlight?: boolean;
};

/** Versão enxuta da linha de hábito, para a Rotina de hoje na tela Hoje. */
export function HabitCompactRow({ day, habit, highlight = false }: HabitCompactRowProps) {
    const { checkLabel, chip, isAvoid, isDone, isRest, pending, toggleDone, toggleRest } =
        useHabitCheckin(habit, day);

    return (
        <li
            aria-busy={pending || undefined}
            className={`flex items-center gap-3 rounded-2xl px-2 py-2 transition ${
                highlight && !isDone && !isRest
                    ? "border border-sloth-moss/25 bg-sloth-card px-3 py-3 shadow-sm"
                    : ""
            }`}
        >
            <HabitCheckButton
                checkLabel={checkLabel}
                isDone={isDone}
                isRest={isRest}
                onClick={toggleDone}
                pending={pending}
                size={highlight ? "lg" : "md"}
            />

            <div className="min-w-0 flex-1">
                {highlight && !isDone && !isRest ? (
                    <p className="text-[11px] font-semibold tracking-[0.14em] text-sloth-moss uppercase">
                        Próximo
                    </p>
                ) : null}
                <Link
                    className={`block truncate font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest ${
                        highlight ? "text-[15px]" : "text-sm"
                    } ${isRest || isDone ? "text-sloth-muted" : "text-sloth-ink"}`}
                    href={`/routine/habits/${habit.id}`}
                >
                    {habit.title}
                </Link>
                <p className="truncate text-xs text-sloth-muted">
                    {formatWhen(habit)} · {stageLabels[habit.stage]}
                    {isAvoid ? " · evitar" : ""}
                </p>
            </div>

            <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-sloth-forest ${
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
                    className="min-h-9 shrink-0 cursor-pointer rounded-lg px-2 text-xs text-sloth-muted transition hover:bg-sloth-beige hover:text-sloth-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest disabled:cursor-default disabled:opacity-60"
                    disabled={pending}
                    onClick={toggleRest}
                    type="button"
                >
                    {isRest ? "Desfazer" : "Folga"}
                </button>
            )}
        </li>
    );
}
