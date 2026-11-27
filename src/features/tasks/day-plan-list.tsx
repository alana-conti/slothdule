"use client";

import {
    DndContext,
    MouseSensor,
    TouchSensor,
    closestCorners,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import type { Announcements, DragEndEvent, UniqueIdentifier } from "@dnd-kit/core";
import {
    SortableContext,
    arrayMove,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useOptimistic, useState, useTransition } from "react";
import type {
    KeyboardEvent as ReactKeyboardEvent,
    MouseEvent as ReactMouseEvent,
    TouchEvent as ReactTouchEvent,
} from "react";

import { useToast } from "@/components/sloth/toast";
import { saveDayPlanAction } from "@/features/tasks/actions";
import { TaskRow } from "@/features/tasks/task-row";
import type { TaskRowPlan } from "@/features/tasks/task-row";
import type { PriorityScoreResult } from "@/lib/priority";
import type { Category, Task } from "@/types/tasks";

export type DayPlanItem = {
    isOverdue: boolean;
    plan: TaskRowPlan;
    priority: PriorityScoreResult;
    task: Task;
};

type DayPlanListProps = {
    categories: Category[];
    items: DayPlanItem[];
    planDate: string;
};

/** Campos onde o gesto é do campo (selecionar texto, abrir a lista), não do arrasto. */
function isFormField(target: EventTarget | null) {
    return (
        target instanceof Element &&
        target.closest("input, textarea, select, [contenteditable='true']") !== null
    );
}

// O card inteiro arrasta; só os campos de formulário ficam de fora.
class CardMouseSensor extends MouseSensor {
    static activators = [
        {
            eventName: "onMouseDown" as const,
            handler: ({ nativeEvent }: ReactMouseEvent) =>
                nativeEvent.button === 0 && !isFormField(nativeEvent.target),
        },
    ];
}

class CardTouchSensor extends TouchSensor {
    static activators = [
        {
            eventName: "onTouchStart" as const,
            handler: ({ nativeEvent }: ReactTouchEvent) =>
                nativeEvent.touches.length === 1 && !isFormField(nativeEvent.target),
        },
    ];
}

function moveButtonId(taskId: string) {
    return `mover-${taskId}`;
}

function SortableRow({
    categories,
    item,
    onMove,
}: {
    categories: Category[];
    item: DayPlanItem;
    onMove: (delta: -1 | 1) => void;
}) {
    const { isDragging, listeners, setNodeRef, transform, transition } =
        useSortable({ id: item.task.id });

    // Teclado: com o foco no botão, cada seta já move uma posição e salva.
    function handleKeyDown(event: ReactKeyboardEvent) {
        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            onMove(event.key === "ArrowUp" ? -1 : 1);
        }
    }

    return (
        <li
            {...listeners}
            className={`relative pointer-coarse:select-none ${isDragging ? "z-10 cursor-grabbing opacity-90" : ""}`}
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
        >
            <button
                aria-label={`Mover ${item.task.title}: use as setas para cima e para baixo`}
                className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:-top-3 focus-visible:left-3 focus-visible:z-20 focus-visible:rounded-full focus-visible:bg-sloth-forest focus-visible:px-3 focus-visible:py-1 focus-visible:text-xs focus-visible:font-semibold focus-visible:text-white"
                id={moveButtonId(item.task.id)}
                onKeyDown={handleKeyDown}
                type="button"
            >
                Mover com as setas ↑ ↓
            </button>
            <TaskRow
                categories={categories}
                isOverdue={item.isOverdue}
                plan={item.plan}
                priority={item.priority}
                task={item.task}
            />
        </li>
    );
}

/** O plano do dia na ordem da pessoa. Arrastar (ou as setas) muda a ordem na hora. */
export function DayPlanList({ categories, items, planDate }: DayPlanListProps) {
    const { toast } = useToast();
    const [, startTransition] = useTransition();
    const serverIds = items.map((item) => item.task.id);
    // Enquanto salva, a lista já mostra a nova ordem; depois vale a do servidor.
    const [orderedIds, setOrderedIds] = useOptimistic(serverIds);
    const byId = new Map(items.map((item) => [item.task.id, item]));
    // Aviso para leitor de tela quando a ordem muda pelo teclado.
    const [moveMessage, setMoveMessage] = useState("");
    const ordered = orderedIds
        .map((id) => byId.get(id))
        .filter((item): item is DayPlanItem => item !== undefined);
    const sensors = useSensors(
        // Mouse: um pequeno arrasto antes de pegar, então clicar segue sendo clique.
        useSensor(CardMouseSensor, { activationConstraint: { distance: 6 } }),
        // Toque: segurar um instante, então deslizar segue rolando a página.
        useSensor(CardTouchSensor, {
            activationConstraint: { delay: 250, tolerance: 8 },
        }),
    );

    const titleOf = (id: UniqueIdentifier) => byId.get(String(id))?.task.title ?? "Tarefa";
    const positionOf = (id: UniqueIdentifier | undefined) =>
        id === undefined ? 0 : orderedIds.indexOf(String(id)) + 1;
    const announcements: Announcements = {
        onDragCancel: ({ active }) =>
            `${titleOf(active.id)} voltou para o lugar. A ordem não mudou.`,
        onDragEnd: ({ active, over }) =>
            `${titleOf(active.id)} ficou na posição ${positionOf(over?.id)} de ${orderedIds.length}.`,
        onDragOver: ({ active, over }) =>
            `${titleOf(active.id)} está na posição ${positionOf(over?.id)} de ${orderedIds.length}.`,
        onDragStart: ({ active }) =>
            `Você pegou ${titleOf(active.id)}, posição ${positionOf(active.id)} de ${orderedIds.length}.`,
    };

    function handleDragEnd({ active, over }: DragEndEvent) {
        if (!over || active.id === over.id) {
            return;
        }

        save(
            arrayMove(
                orderedIds,
                orderedIds.indexOf(String(active.id)),
                orderedIds.indexOf(String(over.id)),
            ),
        );
    }

    function move(taskId: string, delta: -1 | 1) {
        const from = orderedIds.indexOf(taskId);
        const to = from + delta;
        const title = titleOf(taskId);

        if (to < 0 || to >= orderedIds.length) {
            setMoveMessage(`${title} já é a ${to < 0 ? "primeira" : "última"} do plano.`);
            return;
        }

        save(arrayMove(orderedIds, from, to));
        setMoveMessage(`${title} está na posição ${to + 1} de ${orderedIds.length}.`);
        // Ao mudar de lugar o botão pode perder o foco; devolve para seguir com as setas.
        requestAnimationFrame(() => document.getElementById(moveButtonId(taskId))?.focus());
    }

    function save(next: string[]) {
        startTransition(async () => {
            setOrderedIds(next);
            const result = await saveDayPlanAction(planDate, next);

            if (!result.ok) {
                toast({
                    description: result.error,
                    title: "Não foi possível mudar a ordem",
                    tone: "error",
                });
            }
        });
    }

    return (
        <DndContext
            accessibility={{
                announcements,
                screenReaderInstructions: {
                    draggable:
                        "Arraste a tarefa para mudar a ordem. Pelo teclado, use as setas no botão Mover.",
                },
            }}
            collisionDetection={closestCorners}
            // Id fixo: o gerado muda entre servidor e cliente (erro de hidratação).
            id="day-plan"
            onDragEnd={handleDragEnd}
            sensors={sensors}
        >
            <SortableContext
                items={orderedIds}
                strategy={verticalListSortingStrategy}
            >
                <ol aria-label="Plano do dia, em ordem" className="grid gap-2">
                    {ordered.map((item) => (
                        <SortableRow
                            categories={categories}
                            item={item}
                            key={item.task.id}
                            onMove={(delta) => move(item.task.id, delta)}
                        />
                    ))}
                </ol>
                <p aria-live="polite" className="sr-only">
                    {moveMessage}
                </p>
            </SortableContext>
        </DndContext>
    );
}

/** Põe todas as sugestões no fim do plano, na ordem em que aparecem. */
export function AcceptAllButton({
    planDate,
    planIds,
    suggestionIds,
}: {
    planDate: string;
    planIds: string[];
    suggestionIds: string[];
}) {
    const { toast } = useToast();
    const [pending, startTransition] = useTransition();

    return (
        <button
            className="inline-flex min-h-9 cursor-pointer items-center rounded-full border border-sloth-moss/40 px-3 text-xs font-semibold text-sloth-forest transition hover:bg-sloth-moss/10 disabled:cursor-wait disabled:opacity-60"
            disabled={pending}
            onClick={() =>
                startTransition(async () => {
                    const result = await saveDayPlanAction(planDate, [
                        ...planIds,
                        ...suggestionIds,
                    ]);

                    if (!result.ok) {
                        toast({
                            description: result.error,
                            title: "Não foi possível montar o plano",
                            tone: "error",
                        });
                    }
                })
            }
            type="button"
        >
            Aceitar todas
        </button>
    );
}
