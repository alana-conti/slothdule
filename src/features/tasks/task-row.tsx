"use client";

import Link from "next/link";
import {
    useId,
    useMemo,
    useOptimistic,
    useRef,
    useState,
    useTransition,
} from "react";
import type { FormEvent, KeyboardEvent, MouseEvent } from "react";

import { useToast } from "@/components/sloth/toast";
import { ChipSelect } from "@/components/ui/chip-select";
import {
    archiveTaskAction,
    changeTaskStatusAction,
    removeTaskAction,
    updateTaskAction,
    updateTaskFieldsAction,
} from "@/features/tasks/actions";
import type { TaskFieldsPatch } from "@/features/tasks/actions";
import { PauseReasonDialog } from "@/features/tasks/pause-reason-dialog";
import {
    TaskFieldEditor,
    priorityDotClasses,
    priorityLabels,
} from "@/features/tasks/task-field-editor";
import type { TaskEditableField } from "@/features/tasks/task-field-editor";
import { TaskForm } from "@/features/tasks/task-form";
import {
    formatEstimatedMinutes,
    getTaskDailyEstimatedMinutes,
    getTaskDurationDays,
} from "@/features/tasks/today";
import type { PriorityScoreResult } from "@/lib/priority";
import { taskPriorities } from "@/types/tasks";
import type { Category, Task, TaskStatus } from "@/types/tasks";

type TaskRowProps = {
    categories: Category[];
    isOverdue?: boolean;
    priority: PriorityScoreResult;
    task: Task;
};

const statusLabels: Record<TaskStatus, string> = {
    todo: "A fazer",
    in_progress: "Em andamento",
    waiting: "Aguardando",
    done: "Feita",
    archived: "Arquivada",
};

const statusClasses: Record<TaskStatus, string> = {
    todo: "border-sloth-border bg-sloth-card text-sloth-ink",
    in_progress: "border-sloth-moss/40 bg-sloth-moss/10 text-sloth-forest",
    waiting: "border-sloth-amber/40 bg-sloth-amber/10 text-sloth-ink",
    done: "border-sloth-leaf/40 bg-sloth-leaf/10 text-sloth-forest",
    archived: "border-sloth-border bg-sloth-beige/50 text-sloth-muted",
};

function formatDate(date: string) {
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        timeZone: "UTC",
    }).format(new Date(`${date}T00:00:00Z`));
}

function formatSchedule(task: Task) {
    if (task.estimatedMinutes === null) {
        return null;
    }

    const durationDays = getTaskDurationDays(task);

    if (durationDays > 1) {
        const daily = Math.round(getTaskDailyEstimatedMinutes(task));

        return `${formatEstimatedMinutes(daily)} por dia · ${formatEstimatedMinutes(
            task.estimatedMinutes,
        )} em ${durationDays} dias`;
    }

    return `${formatEstimatedMinutes(task.estimatedMinutes)} estimados`;
}

const priorityOptions = taskPriorities.map((value) => ({
    label: priorityLabels[value],
    leading: (
        <span
            aria-hidden="true"
            className={`size-2 shrink-0 rounded-full ${priorityDotClasses[value]}`}
        />
    ),
    value,
}));

const metaChipClasses =
    "-mx-1.5 inline-flex min-h-6 cursor-pointer items-center gap-1.5 rounded-full px-1.5 py-0.5 transition hover:bg-sloth-moss/25 hover:text-sloth-forest hover:ring-1 hover:ring-sloth-moss/60 disabled:cursor-wait";

const actionButtonClasses =
    "inline-flex min-h-10 cursor-pointer items-center rounded-xl border border-sloth-border bg-sloth-card px-4 text-sm font-medium transition hover:bg-sloth-beige";

export function TaskRow({
    categories,
    isOverdue = false,
    priority,
    task,
}: TaskRowProps) {
    const { toast } = useToast();
    const panelId = useId();
    const [expanded, setExpanded] = useState(false);
    const [editing, setEditing] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);
    const [pausing, setPausing] = useState(false);
    const [pending, startTransition] = useTransition();
    // A linha já reflete o novo status enquanto o servidor responde.
    const [status, setOptimisticStatus] = useOptimistic(task.status);
    const [editingTitle, setEditingTitle] = useState(false);
    // Enter/Esc já resolveram a edição: o blur que vem junto não salva de novo.
    const titleSettled = useRef(false);
    const [editingField, setEditingField] = useState<TaskEditableField | null>(
        null,
    );
    // Prioridade, categoria, prazo e estimativa também mudam na hora.
    const savedFields = useMemo(
        () => ({
            categoryId: task.categoryId,
            dueDate: task.dueDate,
            dueTime: task.dueTime,
            estimatedMinutes: task.estimatedMinutes,
            priority: task.priority,
            title: task.title,
        }),
        [
            task.categoryId,
            task.dueDate,
            task.dueTime,
            task.estimatedMinutes,
            task.priority,
            task.title,
        ],
    );
    const [fields, setOptimisticFields] = useOptimistic(
        savedFields,
        (current, patch: TaskFieldsPatch) => ({ ...current, ...patch }),
    );

    const isFinished = status === "done" || status === "archived";
    const schedule = formatSchedule({ ...task, ...fields });
    const categoryOptions = categories.map((item) => ({
        label: item.name,
        value: item.id,
    }));

    function undoTo(previous: TaskStatus, previousReason: string | null) {
        startTransition(async () => {
            // Ao voltar para "aguardando", o recado de antes volta junto.
            const result = await changeTaskStatusAction(
                task.id,
                previous,
                previous === "waiting" ? previousReason : undefined,
            );

            toast(
                result.ok
                    ? {
                          description: `“${task.title}” voltou para ${statusLabels[
                              previous
                          ].toLowerCase()}.`,
                          title: "Desfeito",
                      }
                    : {
                          description: result.error,
                          title: "Não foi possível desfazer",
                          tone: "error",
                      },
            );
        });
    }

    function changeStatus(next: TaskStatus, pauseReason?: string) {
        if (pending || next === status) {
            return;
        }

        const previous = task.status;
        const previousReason = task.pauseReason;

        startTransition(async () => {
            setOptimisticStatus(next);

            const result = await changeTaskStatusAction(
                task.id,
                next,
                next === "waiting" ? (pauseReason ?? undefined) : undefined,
            );

            if (!result.ok) {
                toast({
                    description: result.error,
                    title: "Não foi possível atualizar",
                    tone: "error",
                });
                return;
            }

            const undo = {
                label: "Desfazer",
                onClick: () => undoTo(previous, previousReason),
            };

            if (next === "done") {
                toast({
                    action: undo,
                    description:
                        result.leavesAwarded > 0
                            ? `“${task.title}” está feita. Uma coisa de cada vez: +${result.leavesAwarded} Folhinhas para você.`
                            : `“${task.title}” está feita.`,
                    title: "Tarefa concluída",
                });
                return;
            }

            if (next === "waiting" && previous === "in_progress") {
                toast({
                    action: undo,
                    description: pauseReason
                        ? `“${task.title}” está em pausa: ${pauseReason}`
                        : `“${task.title}” está em pausa. Volte quando der.`,
                    title: "Tarefa pausada",
                });
                return;
            }

            if (next === "in_progress" && previous === "waiting") {
                toast({
                    action: undo,
                    description: `“${task.title}” voltou para em andamento.`,
                    title: "Tarefa retomada",
                });
                return;
            }

            toast({
                action: undo,
                description: `“${task.title}” agora está como ${statusLabels[
                    next
                ].toLowerCase()}.`,
                title: "Status atualizado",
            });
        });
    }

    function saveFields(patch: TaskFieldsPatch) {
        if (pending) {
            return;
        }

        const previous: TaskFieldsPatch = {};

        for (const key of Object.keys(patch) as (keyof TaskFieldsPatch)[]) {
            Object.assign(previous, { [key]: task[key] });
        }

        setEditingField(null);

        startTransition(async () => {
            setOptimisticFields(patch);

            const result = await updateTaskFieldsAction(task.id, patch);

            if (!result.ok) {
                toast({
                    description: result.error,
                    title: "Não foi possível atualizar",
                    tone: "error",
                });
                return;
            }

            toast({
                action: {
                    label: "Desfazer",
                    onClick: () =>
                        startTransition(async () => {
                            const undone = await updateTaskFieldsAction(
                                task.id,
                                previous,
                            );

                            toast(
                                undone.ok
                                    ? {
                                          description: `“${task.title}” voltou como estava.`,
                                          title: "Desfeito",
                                      }
                                    : {
                                          description: undone.error,
                                          title: "Não foi possível desfazer",
                                          tone: "error",
                                      },
                            );
                        }),
                },
                description: `“${task.title}” foi atualizada.`,
                title: "Tarefa atualizada",
            });
        });
    }

    function startEditingTitle() {
        titleSettled.current = false;
        setEditingTitle(true);
    }

    function finishEditingTitle(rawValue: string, save: boolean) {
        if (titleSettled.current) {
            return;
        }

        titleSettled.current = true;
        setEditingTitle(false);

        const nextTitle = rawValue.trim();

        if (save && nextTitle && nextTitle !== fields.title) {
            saveFields({ title: nextTitle });
        }
    }

    function handleTitleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === "Enter") {
            event.preventDefault();
            finishEditingTitle(event.currentTarget.value, true);
        } else if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            finishEditingTitle(event.currentTarget.value, false);
        }
    }

    function toggleField(next: TaskEditableField) {
        setEditingField((current) => (current === next ? null : next));
    }

    // O fundo do card abre os detalhes; controles e texto selecionado não.
    function handleCardClick(event: MouseEvent<HTMLDivElement>) {
        const target = event.target as HTMLElement;

        if (target.closest("a, button, input, label, select, textarea")) {
            return;
        }

        if (window.getSelection()?.toString()) {
            return;
        }

        setExpanded((current) => !current);
    }

    function archive() {
        const previous = task.status;
        const previousReason = task.pauseReason;

        startTransition(async () => {
            const result = await archiveTaskAction(task.id);

            toast(
                result.ok
                    ? {
                          action: {
                              label: "Desfazer",
                              onClick: () =>
                                  undoTo(previous, previousReason),
                          },
                          description: `“${task.title}” foi para o Histórico, no fim da página.`,
                          title: "Tarefa arquivada",
                      }
                    : {
                          description: result.error,
                          title: "Não foi possível arquivar",
                          tone: "error",
                      },
            );
        });
    }

    function remove() {
        startTransition(async () => {
            const result = await removeTaskAction(task.id);

            toast(
                result.ok
                    ? {
                          description: `“${task.title}” foi removida da sua lista.`,
                          title: "Tarefa excluída",
                      }
                    : {
                          description: result.error,
                          title: "Não foi possível excluir",
                          tone: "error",
                      },
            );
        });
    }

    function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (pending) {
            return;
        }

        const formData = new FormData(event.currentTarget);
        setEditError(null);

        startTransition(async () => {
            const result = await updateTaskAction(formData);

            if (!result.ok) {
                setEditError(result.error);
                return;
            }

            setEditing(false);
            toast({
                description:
                    result.leavesAwarded > 0
                        ? `Uma coisa de cada vez: +${result.leavesAwarded} Folhinhas para você.`
                        : `“${result.title}” foi atualizada com calma.`,
                title: "Tarefa atualizada",
            });
        });
    }

    return (
        <article
            aria-busy={pending}
            className={`rounded-2xl border transition ${
                isOverdue
                    ? "border-sloth-terracotta/35 bg-sloth-terracotta/5"
                    : "border-sloth-border bg-sloth-card"
            } ${isFinished ? "opacity-80" : ""}`}
        >
            <div
                className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-2 px-3 py-3 sm:px-4"
                onClick={handleCardClick}
            >
                <button
                    aria-label={
                        isFinished ? "Reabrir tarefa" : "Concluir tarefa"
                    }
                    className={`inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 text-base transition disabled:cursor-wait disabled:opacity-60 ${
                        status === "done"
                            ? "border-sloth-leaf bg-sloth-leaf text-white"
                            : "border-sloth-border text-transparent hover:border-sloth-moss hover:bg-sloth-moss/10 hover:text-sloth-moss"
                    }`}
                    disabled={pending}
                    onClick={() => changeStatus(isFinished ? "todo" : "done")}
                    type="button"
                >
                    <span aria-hidden="true">✓</span>
                </button>

                <div className="min-w-0 flex-1 basis-48">
                    <h3
                        className={`text-base leading-snug font-semibold text-sloth-ink ${
                            isFinished && !editingTitle
                                ? "line-through decoration-1"
                                : ""
                        }`}
                    >
                        {editingTitle ? (
                            <input
                                aria-label="Título da tarefa"
                                autoFocus
                                className="w-full rounded-lg border border-sloth-moss bg-sloth-card px-2 py-0.5 font-semibold outline-none focus:ring-3 focus:ring-sloth-moss/15"
                                defaultValue={fields.title}
                                maxLength={500}
                                onBlur={(event) =>
                                    finishEditingTitle(event.target.value, true)
                                }
                                onFocus={(event) => event.target.select()}
                                onKeyDown={handleTitleKeyDown}
                            />
                        ) : (
                            <button
                                className="-mx-2 cursor-text rounded-lg px-2 py-0.5 text-left transition hover:bg-sloth-moss/25 hover:ring-1 hover:ring-sloth-moss/60 focus-visible:ring-3 focus-visible:ring-sloth-moss/15 focus-visible:outline-none disabled:cursor-wait"
                                disabled={pending}
                                onClick={startEditingTitle}
                                title="Clique para editar o título"
                                type="button"
                            >
                                {fields.title}
                            </button>
                        )}
                    </h3>

                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-sloth-muted">
                        <ChipSelect
                            className="-mx-1.5"
                            disabled={pending}
                            label="Prioridade"
                            onChange={(priority) => saveFields({ priority })}
                            options={priorityOptions}
                            value={fields.priority}
                        />
                        {categories.length > 0 ? (
                            <ChipSelect
                                className="-mx-1.5"
                                disabled={pending}
                                label="Categoria"
                                onChange={(categoryId) =>
                                    saveFields({ categoryId })
                                }
                                options={categoryOptions}
                                triggerClassName="bg-sloth-beige font-medium text-sloth-forest"
                                value={fields.categoryId}
                            />
                        ) : null}
                        <button
                            aria-expanded={editingField === "due"}
                            aria-label="Alterar prazo"
                            className={metaChipClasses}
                            disabled={pending}
                            onClick={() => toggleField("due")}
                            type="button"
                        >
                            Prazo {formatDate(fields.dueDate)}
                            {fields.dueTime
                                ? ` às ${fields.dueTime.slice(0, 5)}`
                                : ""}
                        </button>
                        <button
                            aria-expanded={editingField === "estimate"}
                            aria-label="Alterar estimativa"
                            className={metaChipClasses}
                            disabled={pending}
                            onClick={() => toggleField("estimate")}
                            type="button"
                        >
                            {schedule ?? "Sem estimativa"}
                        </button>
                        {isOverdue ? (
                            <span className="font-medium text-sloth-terracotta">
                                Passou do prazo
                            </span>
                        ) : null}
                    </p>

                    {editingField ? (
                        <TaskFieldEditor
                            disabled={pending}
                            dueDate={fields.dueDate}
                            dueTime={fields.dueTime}
                            estimatedMinutes={fields.estimatedMinutes}
                            field={editingField}
                            onCancel={() => setEditingField(null)}
                            onSave={saveFields}
                        />
                    ) : null}

                    {status === "waiting" && task.pauseReason ? (
                        <p className="mt-1 line-clamp-2 text-xs break-words text-sloth-forest">
                            <span className="font-semibold">Em pausa:</span>{" "}
                            {task.pauseReason}
                        </p>
                    ) : null}
                </div>

                {status === "in_progress" ? (
                    <button
                        aria-label="Pausar tarefa"
                        className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-sloth-moss/40 bg-sloth-moss/10 text-[11px] text-sloth-forest transition hover:bg-sloth-moss/20 disabled:cursor-wait disabled:opacity-60"
                        disabled={pending}
                        onClick={() => setPausing(true)}
                        title="Pausar"
                        type="button"
                    >
                        <span aria-hidden="true">❚❚</span>
                    </button>
                ) : status === "todo" || status === "waiting" ? (
                    <button
                        aria-label={
                            status === "waiting"
                                ? "Retomar tarefa"
                                : "Iniciar tarefa"
                        }
                        className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-sloth-border text-xs text-sloth-forest transition hover:border-sloth-moss hover:bg-sloth-moss/10 disabled:cursor-wait disabled:opacity-60"
                        disabled={pending}
                        onClick={() => changeStatus("in_progress")}
                        title={status === "waiting" ? "Retomar" : "Iniciar"}
                        type="button"
                    >
                        <span aria-hidden="true">▶</span>
                    </button>
                ) : null}

                <label className="relative shrink-0">
                    <span className="sr-only">Status da tarefa</span>
                    <select
                        aria-label="Status da tarefa"
                        className={`min-h-9 cursor-pointer appearance-none rounded-full border py-1 pr-8 pl-3 text-xs font-semibold outline-none transition focus:border-sloth-moss focus-visible:ring-3 focus-visible:ring-sloth-moss/15 disabled:cursor-wait disabled:opacity-60 ${statusClasses[status]}`}
                        disabled={pending}
                        onChange={(event) =>
                            changeStatus(event.target.value as TaskStatus)
                        }
                        value={status}
                    >
                        {(Object.keys(statusLabels) as TaskStatus[]).map(
                            (value) => (
                                <option key={value} value={value}>
                                    {statusLabels[value]}
                                </option>
                            ),
                        )}
                    </select>
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[10px] text-sloth-muted"
                    >
                        ▼
                    </span>
                </label>

                <button
                    aria-controls={panelId}
                    aria-expanded={expanded}
                    aria-label={expanded ? "Ocultar detalhes" : "Mostrar detalhes"}
                    className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-sloth-muted transition hover:bg-sloth-beige"
                    onClick={() => setExpanded((current) => !current)}
                    type="button"
                >
                    <span
                        aria-hidden="true"
                        className={`text-xs transition-transform ${expanded ? "rotate-180" : ""}`}
                    >
                        ▼
                    </span>
                </button>
            </div>

            {expanded ? (
                <div
                    className="border-t border-sloth-border/70 px-4 py-4 sm:px-5"
                    id={panelId}
                >
                    {task.description ? (
                        <p className="leading-7 text-sloth-muted">
                            {task.description}
                        </p>
                    ) : null}

                    {isOverdue ? (
                        <p className="mt-3 text-sm font-medium text-sloth-terracotta">
                            Essa tarefa passou do prazo. Quer reorganizar?
                        </p>
                    ) : null}

                    {!isFinished ? (
                        <details className="group/priority mt-4 max-w-md rounded-2xl border border-dashed border-sloth-border/50 bg-sloth-cream/35 p-3.5 text-xs">
                            <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-sloth-muted transition select-none hover:text-sloth-forest">
                                <span>
                                    Prioridade calculada:{" "}
                                    <strong className="font-semibold text-sloth-ink">
                                        {priority.score} pts
                                    </strong>
                                </span>
                                <span
                                    aria-hidden="true"
                                    className="text-[10px] text-sloth-muted/70 transition-transform group-open/priority:rotate-180"
                                >
                                    ▼
                                </span>
                            </summary>
                            <ul className="mt-2.5 space-y-1.5 leading-relaxed text-sloth-muted">
                                {priority.reasons.map((reason, index) => (
                                    <li
                                        className="flex items-center justify-between gap-4 border-b border-sloth-border/20 pb-1 last:border-0 last:pb-0"
                                        key={index}
                                    >
                                        <span>{reason.description}</span>
                                        <span
                                            className={`shrink-0 font-semibold ${
                                                reason.points >= 0
                                                    ? "text-sloth-leaf"
                                                    : "text-sloth-terracotta"
                                            }`}
                                        >
                                            {reason.points >= 0
                                                ? `+${reason.points}`
                                                : reason.points}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </details>
                    ) : null}

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <button
                            aria-expanded={editing}
                            className={`${actionButtonClasses} text-sloth-forest`}
                            onClick={() => {
                                setEditing((current) => !current);
                                setEditError(null);
                            }}
                            type="button"
                        >
                            Editar
                        </button>

                        {status !== "archived" ? (
                            <button
                                className={`${actionButtonClasses} text-sloth-muted`}
                                disabled={pending}
                                onClick={archive}
                                type="button"
                            >
                                Arquivar
                            </button>
                        ) : null}

                        <button
                            aria-expanded={confirmingDelete}
                            className="inline-flex min-h-10 cursor-pointer items-center rounded-xl border border-sloth-terracotta/35 bg-sloth-card px-4 text-sm font-medium text-sloth-terracotta transition hover:bg-sloth-terracotta/10"
                            onClick={() =>
                                setConfirmingDelete((current) => !current)
                            }
                            type="button"
                        >
                            Excluir
                        </button>

                        <Link
                            className="ml-auto inline-flex min-h-10 items-center rounded-xl bg-sloth-moss px-4 text-sm font-semibold text-white transition hover:bg-sloth-forest"
                            href={`/tasks/${task.id}`}
                        >
                            Ver detalhes e subtarefas
                        </Link>
                    </div>

                    {confirmingDelete ? (
                        <div className="mt-4 max-w-sm rounded-2xl border border-sloth-terracotta/30 bg-sloth-card p-4">
                            <p className="font-semibold text-sloth-ink">
                                Excluir permanentemente?
                            </p>
                            <p className="mt-2 text-sm leading-6 text-sloth-muted">
                                “{task.title}” e seus dados vinculados serão
                                removidos. Esta ação não pode ser desfeita.
                            </p>
                            <button
                                className="mt-4 min-h-10 w-full cursor-pointer rounded-xl bg-sloth-terracotta px-4 text-sm font-semibold text-white transition hover:brightness-95"
                                disabled={pending}
                                onClick={remove}
                                type="button"
                            >
                                Confirmar exclusão
                            </button>
                        </div>
                    ) : null}

                    {editing ? (
                        <div className="mt-4 rounded-2xl border border-sloth-border bg-sloth-card p-4 sm:p-5">
                            {editError ? (
                                <p
                                    className="mb-4 rounded-2xl border border-sloth-terracotta/30 bg-sloth-terracotta/10 px-4 py-3 text-sm text-sloth-ink"
                                    role="alert"
                                >
                                    {editError}
                                </p>
                            ) : null}
                            <TaskForm
                                categories={categories}
                                onSubmit={handleEditSubmit}
                                submitLabel="Salvar alterações"
                                task={task}
                            />
                        </div>
                    ) : null}
                </div>
            ) : null}

            {pausing ? (
                <PauseReasonDialog
                    onCancel={() => setPausing(false)}
                    onConfirm={(reason) => {
                        setPausing(false);
                        changeStatus("waiting", reason);
                    }}
                    taskTitle={task.title}
                />
            ) : null}
        </article>
    );
}
