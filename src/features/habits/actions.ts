"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createHabit, deleteHabit, setHabitCheckin, type CheckinResult } from "@/features/habits/data";
import {
    habitKinds,
    habitPeriods,
    type HabitCheckinStatus,
    type HabitInput,
    type HabitKind,
    type HabitPeriod,
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
