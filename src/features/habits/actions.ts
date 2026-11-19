"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
    createHabit,
    createRoutine,
    deleteHabit,
    deleteRoutine,
    setHabitCheckin,
    updateRoutine,
    type CheckinResult,
} from "@/features/habits/data";
import {
    habitKinds,
    habitPeriods,
    type HabitCheckinStatus,
    type HabitInput,
    type HabitKind,
    type HabitPeriod,
    type RoutineInput,
} from "@/types/habits";

export type HabitCheckinActionResult =
    | ({ ok: true } & CheckinResult)
    | { ok: false; error: string };

function errorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

function text(formData: FormData, field: string) {
    const value = formData.get(field);

    return typeof value === "string" ? value.trim() : "";
}

function parseHabitForm(formData: FormData): HabitInput {
    const title = text(formData, "title");

    if (!title) {
        throw new Error("Dê um nome ao hábito.");
    }

    const kind = text(formData, "kind") || "do";

    if (!habitKinds.includes(kind as HabitKind)) {
        throw new Error("Escolha se o hábito é para fazer ou evitar.");
    }

    const weekdays = formData
        .getAll("weekdays")
        .map((value) => Number(value))
        .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7);

    if (weekdays.length === 0) {
        throw new Error("Escolha pelo menos um dia da semana.");
    }

    const when = text(formData, "when");
    let timeOfDay: string | null = null;
    let period: HabitPeriod | null = null;

    if (when === "time") {
        timeOfDay = text(formData, "timeOfDay") || null;

        if (!timeOfDay || !/^\d{2}:\d{2}$/.test(timeOfDay)) {
            throw new Error("Escolha o horário do hábito.");
        }
    } else if (when === "period") {
        const value = text(formData, "period");

        if (!habitPeriods.includes(value as HabitPeriod)) {
            throw new Error("Escolha o período do dia.");
        }

        period = value as HabitPeriod;
    }

    // Lembrete só faz sentido com horário específico.
    const remind = timeOfDay !== null && formData.get("remind") === "on";

    return { kind: kind as HabitKind, period, remind, timeOfDay, title, weekdays };
}

export type CreateHabitActionResult =
    | { ok: true; habitId: string; title: string }
    | { ok: false; error: string };

export async function createHabitAction(formData: FormData): Promise<CreateHabitActionResult> {
    try {
        const habit = await createHabit(parseHabitForm(formData));
        revalidatePath("/", "layout");

        return { habitId: habit.id, ok: true, title: habit.title };
    } catch (error) {
        return { error: errorMessage(error, "Não foi possível plantar o hábito."), ok: false };
    }
}

export async function setHabitCheckinAction(
    habitId: string,
    day: string,
    status: HabitCheckinStatus | null,
): Promise<HabitCheckinActionResult> {
    try {
        const result = await setHabitCheckin(habitId, day, status);
        revalidatePath("/", "layout");

        return { ok: true, ...result };
    } catch (error) {
        return {
            error: errorMessage(error, "Não foi possível registrar o cuidado."),
            ok: false,
        };
    }
}

export async function deleteHabitAction(habitId: string) {
    try {
        await deleteHabit(habitId);
    } catch (error) {
        redirect(
            `/routine/habits/${encodeURIComponent(habitId)}?error=${encodeURIComponent(
                errorMessage(error, "Não foi possível remover o hábito."),
            )}`,
        );
    }

    revalidatePath("/", "layout");
    redirect(
        `/routine/garden?message=${encodeURIComponent(
            "Hábito removido. As Folhinhas que ele rendeu continuam com você.",
        )}`,
    );
}

const ROUTINE_MAX_STEPS = 12;

function parseRoutineForm(formData: FormData): RoutineInput {
    const name = text(formData, "name");

    if (!name) {
        throw new Error("Dê um nome à rotina.");
    }

    // Os passos chegam na ordem em que aparecem no formulário.
    const habitIds = formData
        .getAll("habitIds")
        .filter((value): value is string => typeof value === "string" && value.length > 0);

    if (habitIds.length === 0) {
        throw new Error("Escolha pelo menos um hábito para a rotina.");
    }

    if (habitIds.length > ROUTINE_MAX_STEPS) {
        throw new Error(`Uma rotina tem no máximo ${ROUTINE_MAX_STEPS} passos.`);
    }

    return { anchor: text(formData, "anchor") || null, habitIds, name };
}

export type RoutineActionResult =
    | { ok: true; routineId: string; name: string }
    | { ok: false; error: string };

/** Cria a rotina, ou atualiza quando `routineId` vem no formulário. */
export async function saveRoutineAction(formData: FormData): Promise<RoutineActionResult> {
    try {
        const input = parseRoutineForm(formData);
        const routineId = text(formData, "routineId");
        const routine = routineId
            ? await updateRoutine(routineId, input)
            : await createRoutine(input);
        revalidatePath("/", "layout");

        return { name: routine.name, ok: true, routineId: routine.id };
    } catch (error) {
        return { error: errorMessage(error, "Não foi possível salvar a rotina."), ok: false };
    }
}

export async function deleteRoutineAction(
    routineId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
        await deleteRoutine(routineId);
        revalidatePath("/", "layout");

        return { ok: true };
    } catch (error) {
        return { error: errorMessage(error, "Não foi possível apagar a rotina."), ok: false };
    }
}
