"use client";

import { useEffect, useRef } from "react";
import type { FormEvent } from "react";

import type { TaskFieldsPatch } from "@/features/tasks/actions";
import type { TaskPriority } from "@/types/tasks";

export type TaskEditableField = "due" | "estimate";

type TaskFieldEditorProps = {
    disabled: boolean;
    dueDate: string | null;
    dueTime: string | null;
    estimatedMinutes: number | null;
    field: TaskEditableField;
    onCancel: () => void;
    onSave: (patch: TaskFieldsPatch) => void;
};

export const priorityLabels: Record<TaskPriority, string> = {
    low: "Baixa",
    medium: "Média",
    high: "Alta",
    critical: "Crítica",
};

export const priorityDotClasses: Record<TaskPriority, string> = {
    low: "bg-sloth-muted/50",
    medium: "bg-sloth-leaf",
    high: "bg-sloth-amber",
    critical: "bg-sloth-terracotta",
};

const inputClasses =
    "min-h-10 rounded-xl border border-sloth-border bg-sloth-card px-3 text-sm outline-none focus:border-sloth-moss focus-visible:ring-3 focus-visible:ring-sloth-moss/15";

const saveClasses =
    "min-h-10 cursor-pointer rounded-xl bg-sloth-moss px-4 text-sm font-semibold text-white transition hover:bg-sloth-forest disabled:cursor-wait disabled:opacity-60";

const cancelClasses =
    "min-h-10 cursor-pointer rounded-xl border border-sloth-border px-4 text-sm font-medium text-sloth-muted transition hover:bg-sloth-beige";

/**
 * Editor compacto de um único campo da tarefa, mostrado logo abaixo da linha.
 * Prazo e estimativa pedem confirmação antes de salvar.
 */
export function TaskFieldEditor({
    disabled,
    dueDate,
    dueTime,
    estimatedMinutes,
    field,
    onCancel,
    onSave,
}: TaskFieldEditorProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        containerRef.current
            ?.querySelector<HTMLElement>("input, [aria-pressed='true'], button")
            ?.focus();
    }, [field]);

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const data = new FormData(event.currentTarget);

        if (field === "due") {
            const nextDate = String(data.get("dueDate") ?? "");
            const nextTime = String(data.get("dueTime") ?? "");

            if (!nextDate) {
                return;
            }

            onSave({ dueDate: nextDate, dueTime: nextTime || null });
            return;
        }

        const minutes = String(data.get("estimatedMinutes") ?? "").trim();

        onSave({ estimatedMinutes: minutes === "" ? null : Number(minutes) });
    }

    return (
        <div
            className="mt-2 flex flex-wrap items-center gap-2 rounded-2xl border border-sloth-border/70 bg-sloth-beige/40 p-2.5 text-sloth-ink"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
                if (event.key === "Escape") {
                    event.stopPropagation();
                    onCancel();
                }
            }}
            ref={containerRef}
            role="group"
            aria-label="Editar tarefa"
        >
            {field === "due" ? (
                <form
                    className="flex flex-wrap items-end gap-2"
                    onSubmit={handleSubmit}
                >
                    <label className="grid gap-1 text-xs font-medium text-sloth-muted">
                        Prazo
                        <input
                            className={inputClasses}
                            defaultValue={dueDate ?? ""}
                            name="dueDate"
                            required
                            type="date"
                        />
                    </label>
                    <label className="grid gap-1 text-xs font-medium text-sloth-muted">
                        Horário
                        <input
                            className={inputClasses}
                            defaultValue={dueTime?.slice(0, 5) ?? ""}
                            name="dueTime"
                            type="time"
                        />
                    </label>
                    <button
                        className={saveClasses}
                        disabled={disabled}
                        type="submit"
                    >
                        Salvar
                    </button>
                    {dueDate ? (
                        <button
                            className={cancelClasses}
                            disabled={disabled}
                            onClick={() =>
                                onSave({ dueDate: null, dueTime: null })
                            }
                            type="button"
                        >
                            Sem pressa
                        </button>
                    ) : null}
                    <button
                        className={cancelClasses}
                        onClick={onCancel}
                        type="button"
                    >
                        Cancelar
                    </button>
                </form>
            ) : null}

            {field === "estimate" ? (
                <form
                    className="flex flex-wrap items-end gap-2"
                    onSubmit={handleSubmit}
                >
                    <label className="grid gap-1 text-xs font-medium text-sloth-muted">
                        Estimativa em minutos
                        <input
                            className={`${inputClasses} w-40`}
                            defaultValue={estimatedMinutes ?? ""}
                            min="0"
                            name="estimatedMinutes"
                            placeholder="Sem estimativa"
                            step="1"
                            type="number"
                        />
                    </label>
                    <button
                        className={saveClasses}
                        disabled={disabled}
                        type="submit"
                    >
                        Salvar
                    </button>
                    <button
                        className={cancelClasses}
                        onClick={onCancel}
                        type="button"
                    >
                        Cancelar
                    </button>
                </form>
            ) : null}
        </div>
    );
}
