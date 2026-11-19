import Link from "next/link";

import { RoutineButton } from "@/features/habits/routine-button";
import type { RoutineHabitOption } from "@/features/habits/routine-events";
import { RoutineStepRow } from "@/features/habits/routine-step-row";
import { formatRoutineMeta, type RoutineDay } from "@/lib/habits";
import type { Habit, Routine } from "@/types/habits";

type RoutineChainCardProps = {
    day: string;
    routineDay: RoutineDay<Habit>;
    /** Para o botão de editar abrir o pop-up já com as opções. */
    habitOptions: RoutineHabitOption[];
    routines: Routine[];
};

/** Uma rotina encadeada com os passos de hoje, na Visão geral. */
export function RoutineChainCard({ day, habitOptions, routineDay, routines }: RoutineChainCardProps) {
    const { complete, routine, steps } = routineDay;
    const headingId = `rotina-${routine.id}`;

    return (
        <article
            aria-labelledby={headingId}
            className={`rounded-3xl border p-4 ${
                complete ? "border-sloth-leaf/35 bg-sloth-leaf/6" : "border-sloth-moss/30 bg-sloth-moss/5"
            }`}
        >
            <div className="flex flex-wrap items-center justify-between gap-3 px-1 pb-3">
                <div className="min-w-0">
                    <h3
                        className="truncate text-xs font-semibold tracking-[0.14em] text-sloth-forest uppercase"
                        id={headingId}
                    >
                        {routine.name}
                    </h3>
                    <p className="mt-0.5 text-[13px] text-sloth-muted">
                        {formatRoutineMeta(routine, steps.length)}
                        {complete ? " · completa hoje" : ""}
                    </p>
                </div>
                <div className="flex items-center gap-1">
                    <RoutineButton
                        aria-label={`Editar ${routine.name}`}
                        className="inline-flex size-9 items-center justify-center rounded-full text-sloth-muted transition hover:bg-sloth-card hover:text-sloth-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest"
                        habits={habitOptions}
                        routine={routine}
                        routines={routines}
                    >
                        <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                    </RoutineButton>
                    <Link
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-sloth-moss px-3 text-[13px] font-semibold text-white transition hover:bg-sloth-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest"
                        aria-label={`Passo a passo: ${routine.name}`}
                        href={`/routine/routines/${routine.id}`}
                    >
                        <svg aria-hidden="true" className="size-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7Z" />
                        </svg>
                        Passo a passo
                    </Link>
                </div>
            </div>

            <ol className="flex flex-col">
                {steps.map((habit, index) => (
                    <RoutineStepRow
                        day={day}
                        habit={habit}
                        key={habit.id}
                        last={index === steps.length - 1}
                    />
                ))}
            </ol>
        </article>
    );
}
