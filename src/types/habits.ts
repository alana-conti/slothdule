export const habitStages = ["broto", "muda", "arbusto", "arvore"] as const;
export type HabitStage = (typeof habitStages)[number];

export const habitKinds = ["do", "avoid"] as const;
export type HabitKind = (typeof habitKinds)[number];

export const habitPeriods = ["morning", "afternoon", "evening"] as const;
export type HabitPeriod = (typeof habitPeriods)[number];

export type HabitCheckinStatus = "done" | "rest";

/** Estado de um dia no calendário do hábito. */
export type HabitDayStatus =
    | "done"
    | "rest"
    | "missed"
    | "pending"
    | "off"
    | "before"
    | "future";

export type Habit = {
    id: string;
    title: string;
    kind: HabitKind;
    /** Dias ISO da semana: 1 = segunda ... 7 = domingo. */
    weekdays: number[];
    timeOfDay: string | null;
    period: HabitPeriod | null;
    /** Lembrete por push no horário (só com `timeOfDay`). */
    remind: boolean;
    startDate: string;
    createdAt: string;
    stage: HabitStage;
    leavesPerCheckin: number;
    growth: number;
    totalCheckins: number;
    currentThreshold: number;
    nextStage: HabitStage | null;
    nextThreshold: number | null;
    missesInRow: number;
    regressionAfter: number;
    scheduledToday: boolean;
    todayStatus: HabitCheckinStatus | null;
    todayLeaves: number;
    /** Rotina encadeada da qual o hábito é um passo (ou `null`, solto). */
    routineId: string | null;
    routinePosition: number | null;
};

export type HabitStageChange = {
    day: string;
    stage: HabitStage;
    direction: "start" | "up" | "down";
};

export type HabitDetail = Habit & {
    history: HabitStageChange[];
    calendar: Array<{ day: string; status: HabitDayStatus }>;
    thresholds: number[];
};

export type HabitToday = {
    date: string;
    leavesEarned: number;
    leavesCap: number;
    scheduled: number;
    done: number;
    rest: number;
    /** Valor do bônus de rotinas do dia (fora do teto). */
    routineBonus: number;
    routineBonusEarned: boolean;
};

export type HabitInput = {
    title: string;
    kind: HabitKind;
    weekdays: number[];
    timeOfDay: string | null;
    period: HabitPeriod | null;
    remind: boolean;
};

/** Rotina encadeada: uma lista ordenada de hábitos (os passos). */
export type Routine = {
    id: string;
    name: string;
    /** Âncora em texto livre: "depois do café". */
    anchor: string | null;
    habitIds: string[];
};

export type RoutineInput = {
    name: string;
    anchor: string | null;
    habitIds: string[];
};
