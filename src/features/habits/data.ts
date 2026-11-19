import "server-only";

import { apiFetch, apiJson, getCurrentUser } from "@/lib/api/server";
import type {
    Habit,
    HabitCheckinStatus,
    HabitDetail,
    HabitInput,
    HabitKind,
    HabitPeriod,
    HabitStage,
    HabitStageChange,
    HabitToday,
    HabitDayStatus,
} from "@/types/habits";

type HabitRow = {
    id: string;
    title: string;
    kind: HabitKind;
    weekdays: number[];
    time_of_day: string | null;
    period: HabitPeriod | null;
    remind: boolean;
    start_date: string;
    created_at: string;
    stage: HabitStage;
    leaves_per_checkin: number;
    growth: number;
    total_checkins: number;
    current_threshold: number;
    next_stage: HabitStage | null;
    next_threshold: number | null;
    misses_in_row: number;
    regression_after: number;
    scheduled_today: boolean;
    today_status: HabitCheckinStatus | null;
    today_leaves: number;
};

type HabitDetailRow = HabitRow & {
    history: HabitStageChange[];
    calendar: Array<{ day: string; status: HabitDayStatus }>;
    thresholds: number[];
};

type HabitTodayRow = {
    date: string;
    leaves_earned: number;
    leaves_cap: number;
    scheduled: number;
    done: number;
    rest: number;
};

export type CheckinResult = {
    habit: Habit;
    leavesAwarded: number;
    leavesToday: number;
    leavesCap: number;
};

type CheckinResultRow = {
    habit: HabitRow;
    leaves_awarded: number;
    leaves_today: number;
    leaves_cap: number;
};

async function requireUser() {
    const user = await getCurrentUser();

    if (!user) {
        throw new Error("Sua sessão expirou. Entre novamente.");
    }

    return user;
}

function mapHabit(row: HabitRow): Habit {
    return {
        createdAt: row.created_at,
        currentThreshold: row.current_threshold,
        growth: row.growth,
        id: row.id,
        kind: row.kind,
        leavesPerCheckin: row.leaves_per_checkin,
        missesInRow: row.misses_in_row,
        nextStage: row.next_stage,
        nextThreshold: row.next_threshold,
        period: row.period,
        regressionAfter: row.regression_after,
        remind: row.remind,
        scheduledToday: row.scheduled_today,
        stage: row.stage,
        startDate: row.start_date,
        timeOfDay: row.time_of_day,
        title: row.title,
        todayLeaves: row.today_leaves,
        todayStatus: row.today_status,
        totalCheckins: row.total_checkins,
        weekdays: row.weekdays,
    };
}

function toPayload(input: HabitInput) {
    return {
        kind: input.kind,
        period: input.period,
        remind: input.remind,
        time_of_day: input.timeOfDay,
        title: input.title,
        weekdays: input.weekdays,
    };
}

export async function listHabits(): Promise<Habit[]> {
    await requireUser();
    const rows = await apiJson<HabitRow[]>("/habits");

    return rows.map(mapHabit);
}

export async function getHabitToday(): Promise<HabitToday> {
    await requireUser();
    const row = await apiJson<HabitTodayRow>("/habits/today");

    return {
        date: row.date,
        done: row.done,
        leavesCap: row.leaves_cap,
        leavesEarned: row.leaves_earned,
        rest: row.rest,
        scheduled: row.scheduled,
    };
}

export async function getHabit(habitId: string): Promise<HabitDetail | null> {
    await requireUser();
    const response = await apiFetch(`/habits/${encodeURIComponent(habitId)}`);

    if (response.status === 404 || response.status === 422) {
        return null;
    }

    if (!response.ok) {
        throw new Error("Não foi possível carregar o hábito.");
    }

    const row = (await response.json()) as HabitDetailRow;

    return {
        ...mapHabit(row),
        calendar: row.calendar,
        history: row.history,
        thresholds: row.thresholds,
    };
}

export async function createHabit(input: HabitInput): Promise<Habit> {
    await requireUser();
    const row = await apiJson<HabitRow>("/habits", {
        body: JSON.stringify(toPayload(input)),
        method: "POST",
    });

    return mapHabit(row);
}

export async function deleteHabit(habitId: string) {
    await requireUser();
    const response = await apiFetch(`/habits/${encodeURIComponent(habitId)}`, {
        method: "DELETE",
    });

    if (!response.ok) {
        throw new Error("Não foi possível remover o hábito.");
    }
}

/** Marca cuidado ou folga no dia; `null` desfaz o registro. */
export async function setHabitCheckin(
    habitId: string,
    day: string,
    status: HabitCheckinStatus | null,
): Promise<CheckinResult> {
    await requireUser();
    const path = `/habits/${encodeURIComponent(habitId)}/checkins/${encodeURIComponent(day)}`;
    const row = await apiJson<CheckinResultRow>(
        path,
        status
            ? { body: JSON.stringify({ status }), method: "PUT" }
            : { method: "DELETE" },
    );

    return {
        habit: mapHabit(row.habit),
        leavesAwarded: row.leaves_awarded,
        leavesCap: row.leaves_cap,
        leavesToday: row.leaves_today,
    };
}
