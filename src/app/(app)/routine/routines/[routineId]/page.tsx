import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getHabitToday, listHabits, listRoutines } from "@/features/habits/data";
import { RoutinePlayer } from "@/features/habits/routine-player";
import { splitHabitsByRoutine } from "@/lib/habits";
import { getCurrentUser } from "@/lib/api/server";

type RoutinePlayerPageProps = {
    params: Promise<{ routineId: string }>;
    searchParams: Promise<{ from?: string }>;
};

/** Modo rotina: os passos de hoje, um de cada vez. */
export default async function RoutinePlayerPage({ params, searchParams }: RoutinePlayerPageProps) {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/login");
    }

    const [{ routineId }, { from }, routines, habits, today] = await Promise.all([
        params,
        searchParams,
        listRoutines(),
        listHabits(),
        getHabitToday(),
    ]);
    const routine = routines.find((item) => item.id === routineId);

    if (!routine) {
        notFound();
    }

    const routineDay = splitHabitsByRoutine([routine], habits).routines[0];
    const backHref = from === "today" ? "/today" : "/routine";
    const backLabel = from === "today" ? "Voltar para Hoje" : "Voltar para a Rotina";

    return (
        <main className="min-h-screen px-5 py-6 sm:px-8 sm:py-10">
            {routineDay ? (
                <RoutinePlayer
                    backHref={backHref}
                    backLabel={backLabel}
                    bonusEarned={today.routineBonusEarned}
                    day={today.date}
                    key={routine.id}
                    routine={routine}
                    steps={routineDay.steps}
                />
            ) : (
                <div className="mx-auto max-w-md rounded-card border border-sloth-border bg-sloth-card p-8 text-center">
                    <h1 className="text-xl font-semibold text-sloth-ink">{routine.name}</h1>
                    <p className="mt-2 text-sm text-sloth-muted">
                        Nenhum passo desta rotina está na agenda de hoje. Pode descansar como uma boa preguiça.
                    </p>
                    <Link
                        className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-sloth-moss px-4 text-sm font-semibold text-white transition hover:bg-sloth-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest"
                        href={backHref}
                    >
                        {backLabel}
                    </Link>
                </div>
            )}
        </main>
    );
}
