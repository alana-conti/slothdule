import Link from "next/link";

import type { Habit } from "@/types/habits";

type TimelineHabitsProps = {
    days: Date[];
    habits: Habit[];
    todayTime: number;
};

function isoWeekday(day: Date) {
    return day.getDay() || 7;
}

function parseDate(value: string) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
}

/**
 * Hábitos com horário na Linha do tempo: uma linha por hábito, com o horário
 * nos dias da agenda. Hoje mostra se já foi cuidado; os outros dias, só a agenda.
 */
export function TimelineHabits({ days, habits, todayTime }: TimelineHabitsProps) {
    if (habits.length === 0) {
        return null;
    }

    return (
        <div aria-label="Rotina com horário" role="group">
            <div className="grid grid-cols-[280px_1fr] border-b border-sloth-border/40 bg-sloth-leaf/10 text-xs font-bold tracking-wider text-sloth-ink uppercase">
                <div className="sticky left-0 z-10 flex items-center gap-2 border-r border-sloth-border/40 bg-sloth-leaf/15 px-4 py-2 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] backdrop-blur-sm">
                    <span>Rotina com horário</span>
                    <span className="ml-1 rounded-full border border-sloth-border/30 bg-sloth-beige/60 px-1.5 py-0.5 text-[10px] font-medium text-sloth-forest normal-case">
                        {habits.length}
                    </span>
                    <Link
                        className="ml-auto text-[10px] font-semibold tracking-normal text-sloth-forest normal-case hover:underline"
                        href="/routine"
                    >
                        Ver rotina
                    </Link>
                </div>
                <div className="py-2" />
            </div>

            {habits.map((habit) => {
                const time = habit.timeOfDay?.slice(0, 5) ?? "";
                const start = parseDate(habit.startDate).getTime();

                return (
                    <div
                        className="grid min-h-[44px] grid-cols-[280px_1fr] border-b border-sloth-border/30 transition hover:bg-sloth-beige/10"
                        key={habit.id}
                    >
                        <div className="sticky left-0 z-10 flex items-center border-r border-sloth-border/40 bg-sloth-card/95 px-4 py-2 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] backdrop-blur-sm select-none">
                            <Link
                                className="max-w-[248px] truncate text-xs font-medium text-sloth-ink transition hover:text-sloth-forest hover:underline"
                                href={`/routine/habits/${habit.id}`}
                                title={`${habit.title} às ${time}`}
                            >
                                <span className="mr-1.5 font-semibold text-sloth-moss">{time}</span>{" "}
                                {habit.title}
                            </Link>
                        </div>
                        <div
                            className="grid"
                            style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
                        >
                            {days.map((day) => {
                                const dayTime = day.getTime();
                                const isToday = dayTime === todayTime;
                                const scheduled =
                                    dayTime >= start && habit.weekdays.includes(isoWeekday(day));
                                let tone = "border border-sloth-moss/30 text-sloth-forest";
                                let label = `agendado às ${time}`;

                                if (isToday && habit.todayStatus === "done") {
                                    tone = "bg-sloth-leaf text-white";
                                    label = "cuidado hoje";
                                } else if (isToday && habit.todayStatus === "rest") {
                                    tone = "bg-sloth-gold/30 text-sloth-ink";
                                    label = "folga hoje";
                                } else if (isToday) {
                                    tone = "border-2 border-dashed border-sloth-moss/60 text-sloth-forest";
                                    label = `hoje às ${time}`;
                                } else if (dayTime < todayTime) {
                                    tone = "text-sloth-muted/70";
                                }

                                return (
                                    <div
                                        className={`flex h-full items-center justify-center border-r border-sloth-border/10 ${
                                            isToday
                                                ? "border-x border-dashed border-sloth-moss/20 bg-sloth-moss/5"
                                                : ""
                                        }`}
                                        key={dayTime}
                                    >
                                        {scheduled ? (
                                            <span
                                                aria-label={`${habit.title}: ${label}`}
                                                className={`rounded-md px-0.5 py-0.5 text-[9px] leading-none font-semibold ${tone}`}
                                                role="img"
                                                title={`${habit.title}: ${label}`}
                                            >
                                                {isToday && habit.todayStatus === "done" ? "✓" : time}
                                            </span>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
