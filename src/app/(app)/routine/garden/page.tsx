import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { listHabits } from "@/features/habits/data";
import { PageNotice } from "@/features/habits/page-notice";
import { PlantBadge } from "@/features/habits/plant-icon";
import { NewHabitButton } from "@/features/habits/new-habit-button";
import { RoutineTabs } from "@/features/habits/routine-tabs";
import {
    HABITS_IN_FORMATION_HINT,
    formatProgress,
    formatWeekdays,
    formatWhen,
    getRestingNotice,
    getStageProgress,
    isInFormation,
    leavesByStage,
    stageLabels,
    stagePluralLabels,
} from "@/lib/habits";
import { getCurrentUser } from "@/lib/api/server";
import { habitStages, type Habit, type HabitStage } from "@/types/habits";

type GardenPageProps = {
    searchParams: Promise<{ error?: string; message?: string; stage?: string }>;
};

const stageOrder = [...habitStages].reverse();

function gardenMessage(habits: Habit[]) {
    if (habits.length === 0) {
        return "Ainda não tem nada plantado. Toda árvore já foi broto um dia.";
    }

    const trees = habits.filter((habit) => habit.stage === "arvore").length;

    if (trees > 0) {
        return trees === 1
            ? "Uma árvore firme no seu jardim. Olha só o que a constância faz."
            : `${trees} árvores firmes no seu jardim. Olha só o que a constância faz.`;
    }

    return habits.length === 1
        ? "Uma planta crescendo. Cada dia cuidado conta."
        : `${habits.length} plantas crescendo. Cada dia cuidado conta.`;
}

function GardenCard({ habit }: { habit: Habit }) {
    const resting = getRestingNotice(habit);
    const progress = getStageProgress(habit);

    return (
        <article className="flex flex-col gap-3.5 rounded-3xl border border-sloth-border bg-sloth-card p-5">
            <div className="flex items-center gap-3">
                <PlantBadge size="md" stage={habit.stage} />
                <div className="min-w-0 flex-1">
                    <Link
                        className="block truncate text-[15px] font-semibold text-sloth-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest"
                        href={`/routine/habits/${habit.id}`}
                    >
                        {habit.title}
                    </Link>
                    <p className="mt-0.5 text-[13px] text-sloth-muted">
                        {stageLabels[habit.stage]} · +{habit.leavesPerCheckin} por dia cuidado
                    </p>
                </div>
            </div>
            <p className="flex flex-wrap gap-1.5">
                {habit.kind === "avoid" ? (
                    <span className="rounded-full bg-sloth-beige px-2.5 py-0.5 text-xs text-sloth-ink">
                        Evitar
                    </span>
                ) : null}
                <span className="inline-flex items-center gap-1 rounded-full bg-sloth-beige px-2.5 py-0.5 text-xs text-sloth-ink">
                    {habit.remind ? (
                        <>
                            <svg aria-hidden="true" className="size-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15Z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
                            <span className="sr-only">Lembrete às </span>
                        </>
                    ) : null}
                    {formatWhen(habit)}
                </span>
                <span className="rounded-full bg-sloth-beige px-2.5 py-0.5 text-xs text-sloth-ink">
                    {formatWeekdays(habit.weekdays)}
                </span>
            </p>
            <div>
                <div
                    aria-label={formatProgress(habit)}
                    className="h-2 overflow-hidden rounded-full bg-sloth-beige"
                    role="img"
                >
                    <div
                        className={`h-2 rounded-full ${habit.nextStage ? "bg-sloth-leaf" : "bg-sloth-gold"}`}
                        style={{ width: `${Math.round(progress * 100)}%` }}
                    />
                </div>
                <p className="mt-2 text-[13px] text-sloth-muted">{formatProgress(habit)}</p>
            </div>
            {resting ? (
                <p className="rounded-2xl bg-sloth-amber/12 p-3 text-[13px] leading-relaxed text-sloth-ink">
                    {resting}
                </p>
            ) : null}
        </article>
    );
}

export default async function GardenPage({ searchParams }: GardenPageProps) {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/login");
    }

    const [{ error, message, stage }, habits] = await Promise.all([searchParams, listHabits()]);
    const filter = habitStages.includes(stage as HabitStage) ? (stage as HabitStage) : null;
    const visible = habits
        .filter((habit) => !filter || habit.stage === filter)
        .sort(
            (a, b) =>
                stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage) ||
                b.growth - a.growth,
        );
    const inFormation = habits.filter((habit) => isInFormation(habit.stage)).length;

    const chip = (key: HabitStage | null, label: string, count: number, reward?: number) => {
        const active = filter === key;

        return (
            <Link
                aria-current={active ? "true" : undefined}
                className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest ${
                    active
                        ? "border-sloth-moss bg-sloth-moss text-white"
                        : "border-sloth-border bg-sloth-card text-sloth-forest hover:bg-sloth-beige"
                }`}
                href={key ? `/routine/garden?stage=${key}` : "/routine/garden"}
                key={key ?? "all"}
            >
                {label}
                <span
                    className={`rounded-full px-2 py-px text-xs ${active ? "bg-white/22" : "bg-sloth-beige"}`}
                >
                    {count}
                </span>
                {reward ? (
                    <span className={`text-xs font-medium ${active ? "text-white/80" : "text-sloth-muted"}`}>
                        +{reward}
                    </span>
                ) : null}
            </Link>
        );
    };

    return (
        <main className="min-h-screen px-5 py-8 sm:px-8 sm:py-12">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
                <RoutineTabs active="garden" />

                <header className="flex flex-wrap items-center justify-between gap-6 rounded-card border border-sloth-border bg-sloth-card p-6 shadow-soft sm:p-8">
                    <div className="min-w-0 flex-[1_1_22rem]">
                        <p className="text-xs font-semibold tracking-[0.2em] text-sloth-moss uppercase">
                            Rotina · Jardim
                        </p>
                        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-sloth-ink sm:text-4xl">
                            Seu jardim
                        </h1>
                        <p className="mt-2 max-w-md text-sm leading-relaxed text-sloth-muted">
                            Cada dia cuidado faz a planta crescer. Faltas soltas não tiram nada, e folga nunca conta como falta.
                        </p>
                        <NewHabitButton
                            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-sloth-border bg-sloth-card px-4 text-sm font-semibold text-sloth-forest transition hover:bg-sloth-beige focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest"
                            inFormation={inFormation}
                        >
                            <svg aria-hidden="true" className="size-[18px]" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" viewBox="0 0 24 24">
                                <path d="M12 5v14M5 12h14" />
                            </svg>
                            Plantar hábito
                        </NewHabitButton>
                    </div>
                    <div className="flex flex-[0_1_24rem] items-end gap-3">
                        <p className="flex-1 rounded-[18px_18px_4px_18px] border border-sloth-leaf/30 bg-sloth-leaf/10 px-4 py-3.5 text-sm leading-relaxed text-sloth-forest">
                            {gardenMessage(habits)}
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

                {habits.length > 0 ? (
                    <>
                        <section aria-label="Filtrar por estágio" className="flex flex-wrap items-center gap-3">
                            <div className="flex flex-1 flex-wrap gap-2">
                                {chip(null, "Todas", habits.length)}
                                {stageOrder.map((key) =>
                                    chip(
                                        key,
                                        stagePluralLabels[key],
                                        habits.filter((habit) => habit.stage === key).length,
                                        leavesByStage[key],
                                    ),
                                )}
                            </div>
                            <span
                                className={`rounded-full px-3 py-1.5 text-[13px] font-semibold ${
                                    inFormation > HABITS_IN_FORMATION_HINT
                                        ? "bg-sloth-amber/20 text-sloth-ink"
                                        : "bg-sloth-beige text-sloth-forest"
                                }`}
                                title="Broto e muda contam como em formação"
                            >
                                Em formação: {inFormation} de {HABITS_IN_FORMATION_HINT}
                            </span>
                        </section>

                        {visible.length > 0 ? (
                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                {visible.map((habit) => (
                                    <GardenCard habit={habit} key={habit.id} />
                                ))}
                            </div>
                        ) : (
                            <p className="rounded-3xl border border-dashed border-sloth-border p-6 text-center text-sm text-sloth-muted">
                                Nenhuma planta neste estágio agora.
                            </p>
                        )}
                    </>
                ) : (
                    <div className="rounded-3xl border border-dashed border-sloth-border px-5 py-10 text-center text-sm text-sloth-muted">
                        <p>Nenhuma planta ainda.</p>
                        <NewHabitButton
                            className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-sloth-moss px-4 font-semibold text-white transition hover:bg-sloth-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest"
                            inFormation={inFormation}
                        >
                            Plantar o primeiro hábito
                        </NewHabitButton>
                    </div>
                )}
            </div>
        </main>
    );
}
