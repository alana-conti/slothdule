/**
 * Regras da Rotina para a interface (docs/11-rotina-e-habitos.md).
 *
 * O backend (`backend/app/services/habits.py`) é quem decide estágio e
 * Folhinhas; aqui ficam os mesmos limiares para a prévia do formulário e os
 * textos de apoio. Mudou uma regra? Mude nos dois lugares.
 */
import type { Habit, HabitPeriod, HabitStage, Routine } from "@/types/habits";

export const HABIT_DAILY_LEAF_CAP = 10;

/** Bônus de rotinas: uma vez por dia, fora do teto (docs/11, seção 3.9). */
export const ROUTINE_BONUS = 2;

/** Quantos hábitos em broto ou muda cabem com folga ao mesmo tempo. */
export const HABITS_IN_FORMATION_HINT = 2;

export const stageLabels: Record<HabitStage, string> = {
    arbusto: "Arbusto",
    arvore: "Árvore",
    broto: "Broto",
    muda: "Muda",
};

export const stagePluralLabels: Record<HabitStage, string> = {
    arbusto: "Arbustos",
    arvore: "Árvores",
    broto: "Brotos",
    muda: "Mudas",
};

export const leavesByStage: Record<HabitStage, number> = {
    arbusto: 3,
    arvore: 4,
    broto: 1,
    muda: 2,
};

export const periodLabels: Record<HabitPeriod, string> = {
    afternoon: "Tarde",
    evening: "Noite",
    morning: "Manhã",
};

const THRESHOLD_ANCHORS: Record<number, [number, number, number]> = {
    1: [3, 8, 25],
    3: [5, 14, 43],
    7: [7, 21, 66],
};

function roundHalfUp(value: number) {
    return Math.floor(value + 0.5);
}

/**
 * Cuidados acumulados para chegar a muda, arbusto e árvore. Âncoras em 1, 3
 * e 7 dias por semana; o resto é interpolado (provisório).
 */
export function getStageThresholds(daysPerWeek: number): {
    arbusto: number;
    arvore: number;
    muda: number;
} {
    const days = Math.max(1, Math.min(7, Math.round(daysPerWeek)));
    const anchors = Object.keys(THRESHOLD_ANCHORS).map(Number);
    let values = THRESHOLD_ANCHORS[days];

    if (!values) {
        const low = Math.max(...anchors.filter((anchor) => anchor < days));
        const high = Math.min(...anchors.filter((anchor) => anchor > days));
        const ratio = (days - low) / (high - low);
        values = THRESHOLD_ANCHORS[low].map((start, index) =>
            roundHalfUp(start + (THRESHOLD_ANCHORS[high][index] - start) * ratio),
        ) as [number, number, number];
    }

    return { arbusto: values[1], arvore: values[2], muda: values[0] };
}

/** Ocorrências seguidas sem cuidado até a planta descer: 2 semanas de agenda. */
export function getRegressionAfter(daysPerWeek: number) {
    return 2 * Math.max(1, Math.min(7, daysPerWeek));
}

export function isInFormation(stage: HabitStage) {
    return stage === "broto" || stage === "muda";
}

const shortWeekdays = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

/** "todos os dias", "seg a sex", "fim de semana" ou "seg, qua e sex". */
export function formatWeekdays(weekdays: number[]) {
    const days = [...new Set(weekdays)]
        .filter((day) => day >= 1 && day <= 7)
        .sort((a, b) => a - b);

    if (days.length === 7) {
        return "todos os dias";
    }

    if (days.join() === "1,2,3,4,5") {
        return "seg a sex";
    }

    if (days.join() === "6,7") {
        return "fim de semana";
    }

    const names = days.map((day) => shortWeekdays[day - 1]);

    if (names.length <= 1) {
        return names[0] ?? "";
    }

    return `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;
}

/** Quando o hábito acontece: "07:30", "Manhã" ou "Qualquer hora". */
export function formatWhen(habit: Pick<Habit, "period" | "timeOfDay">) {
    if (habit.timeOfDay) {
        return habit.timeOfDay.slice(0, 5);
    }

    if (habit.period) {
        return periodLabels[habit.period];
    }

    return "Qualquer hora";
}

const periodOrder: Record<HabitPeriod, number> = {
    afternoon: 14 * 60,
    evening: 19 * 60,
    morning: 8 * 60,
};

/** Ordem do dia: horários e períodos pela hora; "qualquer hora" por último. */
export function sortHabitsForDay<T extends Pick<Habit, "period" | "timeOfDay" | "title">>(
    habits: T[],
) {
    const minutes = (habit: T) => {
        if (habit.timeOfDay) {
            const [hours, mins] = habit.timeOfDay.split(":").map(Number);
            return hours * 60 + mins;
        }

        return habit.period ? periodOrder[habit.period] : 24 * 60;
    };

    return [...habits].sort(
        (a, b) => minutes(a) - minutes(b) || a.title.localeCompare(b.title, "pt-BR"),
    );
}

/** Texto do progresso até o próximo estágio. */
export function formatProgress(
    habit: Pick<Habit, "kind" | "nextStage" | "nextThreshold" | "totalCheckins" | "growth">,
) {
    const unit = habit.kind === "avoid" ? "dias cuidados" : "cuidados";

    if (!habit.nextStage || habit.nextThreshold === null) {
        return `${habit.totalCheckins} ${unit} · estágio máximo`;
    }

    return `${habit.growth} de ${habit.nextThreshold} até ${stageLabels[
        habit.nextStage
    ].toLowerCase()}`;
}

/** Fração (0 a 1) do caminho entre o estágio atual e o próximo. */
export function getStageProgress(
    habit: Pick<Habit, "currentThreshold" | "growth" | "nextThreshold">,
) {
    if (habit.nextThreshold === null) {
        return 1;
    }

    const span = habit.nextThreshold - habit.currentThreshold;

    if (span <= 0) {
        return 1;
    }

    return Math.max(0, Math.min(1, (habit.growth - habit.currentThreshold) / span));
}

/**
 * Aviso gentil de regressão: aparece da metade da janela em diante, para a
 * pessoa ter tempo de voltar sem sustos. Broto nunca desce, então não avisa.
 */
export function getRestingNotice(
    habit: Pick<Habit, "missesInRow" | "regressionAfter" | "stage">,
) {
    if (habit.stage === "broto") {
        return null;
    }

    if (habit.missesInRow < Math.ceil(habit.regressionAfter / 2)) {
        return null;
    }

    const label = stageLabels[habit.stage].toLowerCase();
    const days = habit.missesInRow === 1 ? "1 dia" : `${habit.missesInRow} dias`;

    return `Faz ${days} da agenda sem cuidado. Um cuidado já segura ${
        habit.stage === "muda" ? "a" : habit.stage === "arvore" ? "a" : "o"
    } ${label}, sem pressa.`;
}

export type HabitDayGroups<T> = {
    /** Na agenda de hoje e ainda sem registro, na ordem do dia. */
    pending: T[];
    done: T[];
    rest: T[];
    /** Quantos estão na agenda de hoje (inclui folgas). */
    scheduled: number;
};

/** Separa os hábitos de hoje em pendentes (na ordem do dia), feitos e folgas. */
export function groupHabitsForDay<
    T extends Pick<Habit, "period" | "scheduledToday" | "timeOfDay" | "title" | "todayStatus">,
>(habits: T[]): HabitDayGroups<T> {
    const today = sortHabitsForDay(habits.filter((habit) => habit.scheduledToday));

    return {
        done: today.filter((habit) => habit.todayStatus === "done"),
        pending: today.filter((habit) => habit.todayStatus === null),
        rest: today.filter((habit) => habit.todayStatus === "rest"),
        scheduled: today.length,
    };
}

type DayHabit = Pick<Habit, "id" | "scheduledToday" | "todayStatus">;

export type RoutineDay<T> = {
    routine: Routine;
    /** Passos na agenda de hoje, na ordem da rotina. */
    steps: T[];
    done: number;
    rest: number;
    pending: number;
    /** Todos os passos de hoje feitos (folga não completa). */
    complete: boolean;
};

export type HabitsForDay<T> = {
    /** Rotinas com pelo menos um passo hoje. */
    routines: RoutineDay<T>[];
    /** Rotinas sem passo na agenda de hoje. */
    offToday: Routine[];
    /** Hábitos de hoje fora de qualquer rotina. */
    loose: T[];
};

/** Separa o dia em rotinas encadeadas (com os passos de hoje) e hábitos soltos. */
export function splitHabitsByRoutine<T extends DayHabit>(
    routines: Routine[],
    habits: T[],
): HabitsForDay<T> {
    const byId = new Map(habits.map((habit) => [habit.id, habit]));
    const inRoutine = new Set(routines.flatMap((routine) => routine.habitIds));
    const days: RoutineDay<T>[] = [];
    const offToday: Routine[] = [];

    for (const routine of routines) {
        const steps = routine.habitIds
            .map((id) => byId.get(id))
            .filter((habit): habit is T => habit !== undefined && habit.scheduledToday);

        if (steps.length === 0) {
            offToday.push(routine);
            continue;
        }

        const done = steps.filter((habit) => habit.todayStatus === "done").length;
        const rest = steps.filter((habit) => habit.todayStatus === "rest").length;

        days.push({
            complete: done === steps.length,
            done,
            pending: steps.length - done - rest,
            rest,
            routine,
            steps,
        });
    }

    return {
        loose: habits.filter((habit) => habit.scheduledToday && !inRoutine.has(habit.id)),
        offToday,
        routines: days,
    };
}

export type RoutineBonusState =
    | { status: "none" }
    | { status: "earned" }
    | { status: "rest" }
    | { status: "pending"; stepsLeft: number };

/**
 * Onde o bônus do dia está. `earned` vem do servidor (é quem paga); o resto
 * sai do estado dos passos de hoje.
 */
export function getRoutineBonusState(
    days: Array<Pick<RoutineDay<unknown>, "pending" | "rest">>,
    earned: boolean,
): RoutineBonusState {
    if (earned) {
        return { status: "earned" };
    }

    if (days.length === 0) {
        return { status: "none" };
    }

    if (days.some((day) => day.rest > 0)) {
        return { status: "rest" };
    }

    return { status: "pending", stepsLeft: days.reduce((sum, day) => sum + day.pending, 0) };
}

export function routineBonusMessage(state: RoutineBonusState): string | null {
    switch (state.status) {
        case "earned":
            return `Rotinas de hoje completas. +${ROUTINE_BONUS} Folhinhas de bônus, além do teto de ${HABIT_DAILY_LEAF_CAP}.`;
        case "rest":
            return "Com um passo de folga, as rotinas não fecham hoje e o bônus fica para outro dia. O que você cuidou continua crescendo.";
        case "pending":
            return state.stepsLeft === 1
                ? `Falta 1 passo para completar as rotinas de hoje e ganhar +${ROUTINE_BONUS} de bônus.`
                : `Faltam ${state.stepsLeft} passos para completar as rotinas de hoje e ganhar +${ROUTINE_BONUS} de bônus.`;
        default:
            return null;
    }
}

/** "Depois de acordar · 3 passos" (os passos de hoje, quando informados). */
export function formatRoutineMeta(routine: Pick<Routine, "anchor" | "habitIds">, stepsToday?: number) {
    const count = stepsToday ?? routine.habitIds.length;
    const steps = count === 1 ? "1 passo" : `${count} passos`;

    return routine.anchor ? `${routine.anchor} · ${steps}` : steps;
}
