import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getHabit } from "@/features/habits/data";
import { DeleteHabitControl } from "@/features/habits/delete-habit-control";
import { PageNotice } from "@/features/habits/page-notice";
import { LeafGlyph, PlantBadge } from "@/features/habits/plant-icon";
import {
    formatWeekdays,
    formatWhen,
    getRestingNotice,
    getStageProgress,
    leavesByStage,
    stageLabels,
} from "@/lib/habits";
import { getCurrentUser } from "@/lib/api/server";
import { habitStages, type HabitDayStatus, type HabitDetail } from "@/types/habits";

type HabitPageProps = {
    params: Promise<{ habitId: string }>;
    searchParams: Promise<{ error?: string }>;
};

function formatDay(day: string, withYear = false) {
    return new Intl.DateTimeFormat("pt-BR", {
        day: "numeric",
        month: "long",
        timeZone: "UTC",
        ...(withYear ? { year: "numeric" } : {}),
    }).format(new Date(`${day}T00:00:00Z`));
}

const dayStyles: Record<HabitDayStatus, { cell: string; label: string }> = {
    before: { cell: "bg-transparent", label: "antes de plantar" },
    done: { cell: "bg-sloth-leaf text-white", label: "cuidado" },
    future: { cell: "bg-transparent", label: "ainda não chegou" },
    missed: { cell: "border border-sloth-border bg-sloth-card", label: "sem registro" },
    off: { cell: "bg-sloth-beige/40", label: "fora da agenda" },
    pending: {
        cell: "border-2 border-dashed border-sloth-moss/60 bg-sloth-card",
        label: "hoje, ainda sem registro",
    },
    rest: { cell: "bg-sloth-gold/30", label: "folga" },
};

function StagePath({ habit }: { habit: HabitDetail }) {
    const current = habitStages.indexOf(habit.stage);
    const reachedOn = (index: number) =>
        [...habit.history]
            .reverse()
            .find((change) => change.direction !== "down" && habitStages.indexOf(change.stage) === index)
            ?.day;

    return (
        <ol className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {habitStages.map((stage, index) => {
                const isCurrent = index === current;
                const isPast = index < current;
                const threshold = habit.thresholds[index];
                const day = index <= current ? reachedOn(index) : undefined;
                let detail = "";

                if (index === 0) {
                    detail = `Plantado em ${formatDay(habit.startDate)}`;
                } else if (index <= current) {
                    detail = `${threshold} cuidados${day ? ` · ${formatDay(day)}` : ""}`;
                } else if (index === current + 1) {
                    detail = `${threshold} cuidados · faltam ${Math.max(0, threshold - habit.growth)}`;
                } else {
                    detail = `${threshold} cuidados`;
                }

                return (
                    <li
                        aria-current={isCurrent ? "step" : undefined}
                        className={`rounded-2xl border p-4 ${
                            isCurrent
                                ? "border-sloth-moss bg-sloth-moss/8"
                                : isPast
                                  ? "border-sloth-leaf/30 bg-sloth-card"
                                  : "border-dashed border-sloth-border bg-sloth-card/60"
                        }`}
                        key={stage}
                    >
                        <p className="flex items-center gap-2 text-sm font-semibold text-sloth-ink">
                            <PlantBadge stage={stage} />
                            {stageLabels[stage]}
                            <span
                                className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs whitespace-nowrap ${
                                    isCurrent
                                        ? "bg-sloth-moss text-white"
                                        : isPast
                                          ? "bg-sloth-leaf/18 text-sloth-forest"
                                          : "bg-sloth-beige text-sloth-muted"
                                }`}
                            >
                                {isCurrent ? "agora · " : isPast ? "✓ " : ""}+{leavesByStage[stage]}
                            </span>
                        </p>
                        <p className="mt-2 text-[13px] text-sloth-muted">{detail}</p>
                    </li>
                );
            })}
        </ol>
    );
}

function Calendar({ habit }: { habit: HabitDetail }) {
    const weeks = Array.from({ length: Math.ceil(habit.calendar.length / 7) }, (_, index) =>
        habit.calendar.slice(index * 7, index * 7 + 7),
    );

    return (
        <div className="mt-5">
            <div className="grid grid-cols-[2.5rem_repeat(7,minmax(0,1fr))] gap-1.5 text-center text-xs text-sloth-muted">
                <span />
                {["seg", "ter", "qua", "qui", "sex", "sáb", "dom"].map((day) => (
                    <span key={day}>{day}</span>
                ))}
                {weeks.map((week) => (
                    <div className="contents" key={week[0].day}>
                        <span className="self-center text-left text-[11px]">
                            {new Intl.DateTimeFormat("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                                timeZone: "UTC",
                            }).format(new Date(`${week[0].day}T00:00:00Z`))}
                        </span>
                        {week.map(({ day, status }) => (
                            <span
                                aria-label={`${formatDay(day)}: ${dayStyles[status].label}`}
                                className={`flex aspect-square items-center justify-center rounded-lg text-[11px] ${dayStyles[status].cell}`}
                                key={day}
                                role="img"
                                title={`${formatDay(day)}: ${dayStyles[status].label}`}
                            >
                                {status === "done" ? "✓" : ""}
                            </span>
                        ))}
                    </div>
                ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-sloth-muted">
                {(["done", "rest", "missed", "off"] as const).map((status) => (
                    <span className="inline-flex items-center gap-1.5" key={status}>
                        <span className={`size-3 rounded ${dayStyles[status].cell}`} />
                        {dayStyles[status].label[0].toUpperCase() + dayStyles[status].label.slice(1)}
                    </span>
                ))}
            </div>
        </div>
    );
}

export default async function HabitPage({ params, searchParams }: HabitPageProps) {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/login");
    }

    const [{ habitId }, { error }] = await Promise.all([params, searchParams]);
    const habit = await getHabit(habitId);

    if (!habit) {
        notFound();
    }

    const resting = getRestingNotice(habit);
    const unit = habit.kind === "avoid" ? "dias cuidados" : "cuidados";
    const progress = getStageProgress(habit);

    return (
        <main className="min-h-screen px-5 py-8 sm:px-8 sm:py-12">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
                <Link
                    className="inline-flex min-h-9 w-fit items-center gap-1.5 text-sm font-semibold text-sloth-forest hover:text-sloth-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest"
                    href="/routine/garden"
                >
                    <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="m15 18-6-6 6-6" />
                    </svg>
                    Jardim
                </Link>

                <PageNotice error={error} />

                <header className="flex flex-wrap items-center gap-6 rounded-card border border-sloth-border bg-sloth-card p-6 shadow-soft sm:p-8">
                    <PlantBadge size="lg" stage={habit.stage} />
                    <div className="min-w-0 flex-[1_1_18rem]">
                        <p className="text-xs font-semibold tracking-[0.2em] text-sloth-moss uppercase">
                            Hábito · {stageLabels[habit.stage]}
                        </p>
                        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-sloth-ink sm:text-4xl">
                            {habit.title}
                        </h1>
                        <p className="mt-3 flex flex-wrap gap-1.5">
                            {habit.kind === "avoid" ? (
                                <span className="rounded-full bg-sloth-beige px-2.5 py-1 text-[13px] text-sloth-ink">
                                    Evitar
                                </span>
                            ) : null}
                            <span className="rounded-full bg-sloth-beige px-2.5 py-1 text-[13px] text-sloth-ink first-letter:uppercase">
                                {formatWeekdays(habit.weekdays)}
                            </span>
                            <span className="rounded-full bg-sloth-beige px-2.5 py-1 text-[13px] text-sloth-ink">
                                {formatWhen(habit)}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-sloth-leaf/18 px-2.5 py-1 text-[13px] font-semibold text-sloth-forest">
                                <span className="text-sloth-leaf">
                                    <LeafGlyph />
                                </span>
                                +{habit.leavesPerCheckin} por dia cuidado
                            </span>
                        </p>
                    </div>
                    <DeleteHabitControl habitId={habit.id} title={habit.title} />
                </header>

                <section className="rounded-card border border-sloth-border bg-sloth-card/55 p-5 sm:p-7">
                    <p className="text-xs font-semibold tracking-[0.18em] text-sloth-moss uppercase">
                        Crescimento
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-sloth-ink">
                        {habit.nextStage && habit.nextThreshold !== null
                            ? `${habit.growth} de ${habit.nextThreshold} ${unit} até virar ${stageLabels[
                                  habit.nextStage
                              ].toLowerCase()}`
                            : `Árvore firme, com ${habit.totalCheckins} ${unit}`}
                    </h2>
                    {resting ? (
                        <p className="mt-3 rounded-2xl bg-sloth-amber/12 p-3 text-sm leading-relaxed text-sloth-ink">
                            {resting}
                        </p>
                    ) : null}
                    <StagePath habit={habit} />
                    <div
                        aria-label={`${Math.round(progress * 100)}% do caminho até o próximo estágio`}
                        className="mt-5 h-2.5 overflow-hidden rounded-full bg-sloth-beige"
                        role="img"
                    >
                        <div
                            className={`h-2.5 rounded-full ${habit.nextStage ? "bg-sloth-leaf" : "bg-sloth-gold"}`}
                            style={{ width: `${Math.round(progress * 100)}%` }}
                        />
                    </div>
                </section>

                <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
                    <section className="rounded-card border border-sloth-border bg-sloth-card p-5 sm:p-7">
                        <p className="text-xs font-semibold tracking-[0.18em] text-sloth-moss uppercase">
                            Últimas semanas
                        </p>
                        <h2 className="mt-2 text-xl font-semibold text-sloth-ink">
                            {habit.totalCheckins === 1
                                ? `1 dia cuidado desde ${formatDay(habit.startDate)}`
                                : `${habit.totalCheckins} dias cuidados desde ${formatDay(habit.startDate)}`}
                        </h2>
                        <Calendar habit={habit} />
                    </section>

                    <section className="rounded-card border border-sloth-border bg-sloth-card p-5 sm:p-7">
                        <div className="flex items-start gap-4">
                            <Image
                                alt="Mascote bicho-preguiça"
                                className="h-auto w-16 shrink-0"
                                height={877}
                                sizes="64px"
                                src="/images/sloth-mascot.png"
                                width={900}
                            />
                            <div>
                                <h2 className="text-lg font-semibold text-sloth-ink">Como a planta cresce</h2>
                                <ul className="mt-3 grid list-disc gap-2 pl-4 text-sm leading-relaxed text-sloth-muted">
                                    <li>Cada dia cuidado conta. Não precisa ser em sequência.</li>
                                    <li>Faltas soltas não tiram nada.</li>
                                    <li>
                                        Se ficar umas 2 semanas da agenda sem cuidar, ela volta um estágio. E recupera rápido.
                                    </li>
                                    <li>Folga não conta como falta.</li>
                                    <li>Até 10 Folhinhas por dia vêm dos hábitos. Depois disso, a planta continua crescendo.</li>
                                </ul>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}
