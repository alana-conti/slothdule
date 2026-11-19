import Link from "next/link";

import { HabitCompactRow } from "@/features/habits/habit-compact-row";
import { LeafGlyph, PlantIcon } from "@/features/habits/plant-icon";
import { groupHabitsForDay } from "@/lib/habits";
import type { Habit, HabitToday } from "@/types/habits";

type TodayRoutineCardProps = {
    habits: Habit[];
    today: HabitToday;
};

/**
 * "Rotina de hoje" na tela Hoje: compacta e separada das tarefas, fora da
 * carga do dia e dos atrasados. Sem hábitos na agenda de hoje, não aparece.
 */
export function TodayRoutineCard({ habits, today }: TodayRoutineCardProps) {
    const groups = groupHabitsForDay(habits);

    if (groups.scheduled === 0) {
        return null;
    }

    const due = groups.scheduled - groups.rest.length;
    const handled = [...groups.done, ...groups.rest];
    const allHandled = groups.pending.length === 0;

    return (
        <section
            aria-labelledby="rotina-de-hoje"
            className="mt-6 rounded-card border border-sloth-moss/25 bg-sloth-moss/5 p-4 sm:p-6"
        >
            <div className="flex flex-wrap items-center gap-3">
                <span
                    aria-hidden="true"
                    className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-sloth-leaf/15 text-sloth-forest"
                >
                    <PlantIcon className="size-6" stage="broto" />
                </span>
                <div className="min-w-0 flex-1">
                    <h2
                        className="text-xs font-semibold tracking-[0.16em] text-sloth-moss uppercase"
                        id="rotina-de-hoje"
                    >
                        Rotina de hoje
                    </h2>
                    <p className="mt-0.5 text-sm text-sloth-ink">
                        <span className="font-semibold">{groups.done.length}</span> de {due}{" "}
                        {due === 1 ? "cuidado" : "cuidados"}
                        {groups.rest.length > 0
                            ? ` · ${groups.rest.length} de folga`
                            : ""}
                    </p>
                </div>
                <span
                    className="inline-flex items-center gap-1 rounded-full bg-sloth-card px-2.5 py-1 text-xs font-semibold text-sloth-forest"
                    title="Folhinhas de hábitos hoje, até o teto diário"
                >
                    <span className="text-sloth-leaf">
                        <LeafGlyph />
                    </span>
                    {today.leavesEarned}/{today.leavesCap}
                    <span className="sr-only"> Folhinhas de hábitos hoje</span>
                </span>
                <Link
                    className="inline-flex min-h-9 items-center rounded-xl px-2 text-sm font-semibold text-sloth-forest hover:bg-sloth-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest"
                    href="/routine"
                >
                    Ver tudo
                </Link>
            </div>

            {allHandled ? (
                <p className="mt-4 rounded-2xl bg-sloth-leaf/12 px-4 py-3 text-sm text-sloth-forest">
                    Tudo cuidado por hoje. Pode descansar como uma boa preguiça.
                </p>
            ) : (
                <ul className="mt-4 grid gap-1">
                    {groups.pending.map((habit, index) => (
                        <HabitCompactRow
                            day={today.date}
                            habit={habit}
                            highlight={index === 0}
                            key={habit.id}
                        />
                    ))}
                </ul>
            )}

            {handled.length > 0 ? (
                <details className="group mt-3">
                    <summary className="flex min-h-9 cursor-pointer list-none items-center gap-1.5 rounded-xl px-2 text-sm text-sloth-muted hover:text-sloth-forest [&::-webkit-details-marker]:hidden">
                        <svg aria-hidden="true" className="size-4 transition group-open:rotate-90" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="m9 18 6-6-6-6" />
                        </svg>
                        {groups.done.length > 0
                            ? `${groups.done.length} ${groups.done.length === 1 ? "cuidado feito" : "cuidados feitos"}`
                            : "Folgas de hoje"}
                        {groups.done.length > 0 && groups.rest.length > 0
                            ? ` · ${groups.rest.length} de folga`
                            : ""}
                    </summary>
                    <ul className="mt-1 grid gap-1">
                        {handled.map((habit) => (
                            <HabitCompactRow day={today.date} habit={habit} key={habit.id} />
                        ))}
                    </ul>
                </details>
            ) : null}
        </section>
    );
}
