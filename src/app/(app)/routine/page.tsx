import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getHabitToday, listHabits } from "@/features/habits/data";
import { HabitDayRow } from "@/features/habits/habit-day-row";
import { PageNotice } from "@/features/habits/page-notice";
import { RoutineTabs } from "@/features/habits/routine-tabs";
import { habitStages, type Habit, type HabitToday } from "@/types/habits";
import { sortHabitsForDay, stageLabels, stagePluralLabels } from "@/lib/habits";
import { getCurrentUser } from "@/lib/api/server";

type RoutinePageProps = {
    searchParams: Promise<{ error?: string; message?: string }>;
};

function formatLongDate(date: string) {
    return new Intl.DateTimeFormat("pt-BR", {
        day: "numeric",
        month: "long",
        timeZone: "UTC",
        weekday: "long",
    }).format(new Date(`${date}T00:00:00Z`));
}

function mascotMessage(habits: Habit[], today: HabitToday) {
    if (habits.length === 0) {
        return "Um jardim começa com uma plantinha só. Que tal escolher um hábito pequeno?";
    }

    if (today.scheduled === 0) {
        return "Nenhum hábito na agenda de hoje. Pode descansar como uma boa preguiça.";
    }

    const left = today.scheduled - today.done - today.rest;

    if (left === 0) {
        return "Tudo cuidado por hoje. Pode descansar como uma boa preguiça.";
    }

    if (today.leavesEarned >= today.leavesCap) {
        return "Teto de Folhinhas de hoje alcançado. O que você cuidar agora continua fazendo as plantas crescerem.";
    }

    if (today.done === 0) {
        return left === 1
            ? "Só um hábito na agenda de hoje. Uma coisa de cada vez."
            : `${left} hábitos na agenda de hoje. Comece pelo mais fácil.`;
    }

    return left === 1
        ? "Falta só um cuidado para fechar o dia."
        : `Faltam ${left} cuidados hoje. Sem pressa.`;
}

function gardenSummary(habits: Habit[]) {
    const parts = [...habitStages]
        .reverse()
        .map((stage) => {
            const count = habits.filter((habit) => habit.stage === stage).length;

            if (count === 0) {
                return null;
            }

            return `${count} ${(count === 1 ? stageLabels[stage] : stagePluralLabels[stage]).toLowerCase()}`;
        })
        .filter(Boolean);

    return parts.length > 0 ? parts.join(" · ") : "Nenhuma planta ainda";
}

export default async function RoutinePage({ searchParams }: RoutinePageProps) {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/login");
    }

    const [{ error, message }, habits, today] = await Promise.all([
        searchParams,
        listHabits(),
        getHabitToday(),
    ]);

    const todayHabits = sortHabitsForDay(habits.filter((habit) => habit.scheduledToday));
    const capPercent = Math.round((today.leavesEarned / today.leavesCap) * 100);
    const capReached = today.leavesEarned >= today.leavesCap;

    return (
        <main className="min-h-screen px-5 py-8 sm:px-8 sm:py-12">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
                <RoutineTabs active="overview" />

                <header className="flex flex-wrap items-center justify-between gap-6 rounded-card border border-sloth-border bg-sloth-card p-6 shadow-soft sm:p-8">
                    <div className="min-w-0 flex-[1_1_22rem]">
                        <p className="text-xs font-semibold tracking-[0.2em] text-sloth-moss uppercase">
                            Rotina · Visão geral
                        </p>
                        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-sloth-ink sm:text-4xl">
                            Cuidando do seu jardim
                        </h1>
                        <p className="mt-2 text-sm text-sloth-muted first-letter:uppercase">
                            {formatLongDate(today.date)}
                        </p>
                        <div className="mt-5 flex flex-wrap gap-2">
                            <Link
                                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-sloth-border bg-sloth-card px-4 text-sm font-semibold text-sloth-forest transition hover:bg-sloth-beige focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest"
                                href="/routine/new"
                            >
                                <svg aria-hidden="true" className="size-[18px]" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" viewBox="0 0 24 24">
                                    <path d="M12 5v14M5 12h14" />
                                </svg>
                                Novo hábito
                            </Link>
                        </div>
                    </div>
                    <div className="flex flex-[0_1_24rem] items-end gap-3">
                        <p className="flex-1 rounded-[18px_18px_4px_18px] border border-sloth-leaf/30 bg-sloth-leaf/10 px-4 py-3.5 text-sm leading-relaxed text-sloth-forest">
                            {mascotMessage(habits, today)}
                        </p>
                        <Image
                            alt="Mascote bicho-preguiça"
                            className="h-auto w-20 shrink-0 sm:w-22"
                            height={877}
                            sizes="88px"
                            src="/images/sloth-mascot.png"
                            width={900}
                        />
                    </div>
                </header>

                <PageNotice error={error} message={message} />

                <section aria-label="Resumo de hoje" className="grid gap-4 sm:grid-cols-3">
                    <article className="rounded-card border border-sloth-border bg-sloth-card p-6">
                        <p className="text-sm font-medium text-sloth-muted">Cuidados hoje</p>
                        <p className="mt-2 text-3xl font-semibold text-sloth-ink">
                            {today.done}{" "}
                            <span className="text-lg font-medium text-sloth-muted">
                                de {today.scheduled - today.rest}
                            </span>
                        </p>
                        <p className="mt-2 text-sm text-sloth-muted">
                            {today.rest > 0
                                ? today.rest === 1
                                    ? "1 hábito de folga hoje"
                                    : `${today.rest} hábitos de folga hoje`
                                : "hábitos da agenda de hoje"}
                        </p>
                    </article>
                    <article className="rounded-card border border-sloth-border bg-sloth-card p-6">
                        <p className="text-sm font-medium text-sloth-muted">Folhinhas de hábitos hoje</p>
                        <p className="mt-2 text-3xl font-semibold text-sloth-ink">
                            {today.leavesEarned}{" "}
                            <span className="text-lg font-medium text-sloth-muted">
                                de {today.leavesCap}
                            </span>
                        </p>
                        <div
                            aria-label={`${today.leavesEarned} de ${today.leavesCap} Folhinhas de hábitos hoje`}
                            className="mt-3 h-2 overflow-hidden rounded-full bg-sloth-beige"
                            role="img"
                        >
                            <div
                                className="h-2 rounded-full bg-sloth-leaf transition-[width]"
                                style={{ width: `${capPercent}%` }}
                            />
                        </div>
                        <p className="mt-2 text-sm text-sloth-muted">
                            {capReached
                                ? "Teto de hoje alcançado. As plantas continuam crescendo."
                                : `Até ${today.leavesCap} por dia vêm dos hábitos.`}
                        </p>
                    </article>
                    <article className="rounded-card border border-sloth-border bg-sloth-card p-6">
                        <p className="text-sm font-medium text-sloth-muted">Seu jardim</p>
                        <p className="mt-2 text-3xl font-semibold text-sloth-ink">
                            {habits.length}{" "}
                            <span className="text-lg font-medium text-sloth-muted">
                                {habits.length === 1 ? "planta" : "plantas"}
                            </span>
                        </p>
                        <p className="mt-2 text-sm text-sloth-muted">{gardenSummary(habits)}</p>
                        <Link
                            className="mt-1 inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-sloth-forest hover:text-sloth-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest"
                            href="/routine/garden"
                        >
                            Ver o jardim
                            <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="m9 18 6-6-6-6" />
                            </svg>
                        </Link>
                    </article>
                </section>

                <section
                    aria-labelledby="hoje-na-rotina"
                    className="flex flex-col gap-5 rounded-card border border-sloth-border bg-sloth-card/55 p-5 sm:p-7"
                >
                    <div>
                        <p className="text-xs font-semibold tracking-[0.18em] text-sloth-moss uppercase">
                            Agora
                        </p>
                        <h2
                            className="mt-2 text-2xl font-semibold text-sloth-ink"
                            id="hoje-na-rotina"
                        >
                            Hoje na rotina
                        </h2>
                        <p className="mt-1 text-sm text-sloth-muted">
                            Só aparece o que está na agenda de hoje. Fez em outro horário? Conta igual.
                        </p>
                    </div>

                    {todayHabits.length > 0 ? (
                        <ul className="grid gap-2">
                            {todayHabits.map((habit) => (
                                <HabitDayRow day={today.date} habit={habit} key={habit.id} />
                            ))}
                        </ul>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-sloth-border px-5 py-8 text-center text-sm text-sloth-muted">
                            {habits.length === 0 ? (
                                <>
                                    <p>Seu jardim ainda está vazio.</p>
                                    <Link
                                        className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-sloth-moss px-4 font-semibold text-white transition hover:bg-sloth-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest"
                                        href="/routine/new"
                                    >
                                        Plantar o primeiro hábito
                                    </Link>
                                </>
                            ) : (
                                <p>Nenhum hábito na agenda de hoje.</p>
                            )}
                        </div>
                    )}

                    {habits.some((habit) => habit.kind === "avoid") ? (
                        <p className="text-[13px] text-sloth-muted">
                            Hábitos de evitar são marcados por você, quando quiser. Nada é marcado como falha sozinho.
                        </p>
                    ) : null}
                </section>
            </div>
        </main>
    );
}
